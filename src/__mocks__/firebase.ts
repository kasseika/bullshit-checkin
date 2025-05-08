export const firestoreDb = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  add: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
};

export const functions = {
  httpsCallable: jest.fn().mockImplementation(() => jest.fn()),
};

export const auth = {
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
};

export const firebaseApp = {
  firestore: jest.fn().mockReturnValue(firestoreDb),
  functions: jest.fn().mockReturnValue(functions),
  auth: jest.fn().mockReturnValue(auth),
};

jest.mock('@/lib/firebase', () => ({
  firestoreDb,
  functions,
  auth,
  firebaseApp,
}));
