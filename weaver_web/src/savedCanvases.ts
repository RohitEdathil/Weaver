import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export interface SavedCanvas {
  id: string
  title: string
  code: string
  sessionId: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

function canvasesCollection() {
  if (!db) throw new Error('Firebase is not configured')
  return collection(db, 'canvases')
}

function toSavedCanvas(id: string, data: DocumentData): SavedCanvas {
  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Untitled',
    code: typeof data.code === 'string' ? data.code : '',
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : '',
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    updatedAt: (data.updatedAt as Timestamp | null) ?? null,
  }
}

/** Create a new saved canvas tagged with the device that created it. */
export async function saveCanvas(
  deviceId: string,
  input: { title: string; code: string; sessionId: string },
): Promise<string> {
  const ref = await addDoc(canvasesCollection(), {
    deviceId,
    title: input.title,
    code: input.code,
    sessionId: input.sessionId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/** Overwrite the code of an existing canvas and bump its updated time. */
export async function updateCanvas(id: string, code: string): Promise<void> {
  if (!db) throw new Error('Firebase is not configured')
  await updateDoc(doc(db, 'canvases', id), {
    code,
    updatedAt: serverTimestamp(),
  })
}

/** List the device's canvases, most recently updated first. */
export async function listCanvases(deviceId: string): Promise<SavedCanvas[]> {
  const snapshot = await getDocs(
    query(canvasesCollection(), where('deviceId', '==', deviceId)),
  )
  return snapshot.docs
    .map((entry) => toSavedCanvas(entry.id, entry.data()))
    .sort(
      (a, b) =>
        (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0),
    )
}

/** Delete a saved canvas. */
export async function deleteCanvas(id: string): Promise<void> {
  if (!db) throw new Error('Firebase is not configured')
  await deleteDoc(doc(db, 'canvases', id))
}
