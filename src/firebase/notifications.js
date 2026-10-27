import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase.js";

const SERVICE_WORKER_PATH = "/firebase-messaging-sw.js";

// A Web Push (VAPID) public key is URL-safe base64, about 87-88 characters.
const VAPID_KEY_PATTERN = /^[A-Za-z0-9_-]{80,90}$/;

/**
 * Read the VAPID key from the environment and remove quotes / spaces that
 * are often copied into .env by mistake.
 */
function getVapidKey() {
  const rawKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  

  return String(rawKey ?? "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

/**
 * Validate the VAPID key before sending it to the browser, so a wrong key
 * produces a clear message instead of "applicationServerKey is not valid".
 */
function assertValidVapidKey(vapidKey) {
  if (!vapidKey) {
    throw new Error(
      "VITE_FIREBASE_VAPID_KEY is missing from .env. Add it and restart the dev server."
    );
  }

  if (!VAPID_KEY_PATTERN.test(vapidKey)) {
    throw new Error(
      "VITE_FIREBASE_VAPID_KEY looks invalid. Copy the Key pair from Firebase Console > Project settings > Cloud Messaging > Web Push certificates, then restart the dev server."
    );
  }
}

/**
 * Register (or reuse) the Firebase messaging service worker.
 */
async function getServiceWorkerRegistration() {
  const existing = await navigator.serviceWorker.getRegistration(
    SERVICE_WORKER_PATH
  );

  const registration =
    existing ||
    (await navigator.serviceWorker.register(SERVICE_WORKER_PATH));

  await navigator.serviceWorker.ready;

  return registration;
}

/**
 * Convert low-level Firebase / browser errors into messages people can act on.
 */
function toFriendlyError(error) {
  const message = String(error?.message || "");

  if (error?.name === "InvalidAccessError" || /applicationServerKey/i.test(message)) {
    return new Error(
      "The VAPID key does not match this Firebase project or is not a valid Web Push key. Generate or copy the key pair from the same Firebase project used in your Firebase config."
    );
  }

  if (error?.code === "messaging/permission-blocked") {
    return new Error(
      "Notifications are blocked for this site. Allow notifications in your browser settings and try again."
    );
  }

  if (error?.code === "messaging/failed-service-worker-registration") {
    return new Error(
      `The service worker ${SERVICE_WORKER_PATH} could not be registered. Make sure the file exists in the public folder.`
    );
  }

  return error instanceof Error ? error : new Error(message || "Push setup failed.");
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    throw new Error("This browser does not support notifications.");
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }

  // Validate configuration first so we do not ask for permission needlessly.
  const vapidKey = getVapidKey();



  assertValidVapidKey(vapidKey);

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(`Notification permission: ${permission}`);
  }

  const messaging = await getFirebaseMessaging();

  if (!messaging) {
    throw new Error("Firebase Messaging is not supported in this browser.");
  }

  try {
    const registration = await getServiceWorkerRegistration();

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      throw new Error("Firebase did not generate an FCM token.");
    }


    return token;
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function listenForForegroundMessages(callback) {
  const messaging = await getFirebaseMessaging();

  if (!messaging) {
    return () => {};
  }

  return onMessage(messaging, callback);
}