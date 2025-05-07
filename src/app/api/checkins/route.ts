import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const dataToSave = {
      ...data,
      serverCheckInTime: serverTimestamp(),
      createdAt: serverTimestamp()
    };
    
    const checkinsRef = collection(firestoreDb, 'checkins');
    await addDoc(checkinsRef, dataToSave);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('チェックインデータの保存に失敗しました:', error);
    return NextResponse.json(
      { success: false, error: 'データの保存に失敗しました' },
      { status: 500 }
    );
  }
}
