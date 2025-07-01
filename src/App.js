import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc
} from "firebase/firestore";
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const firebaseConfig = {
  apiKey: "AIzaSyAXxzJ7OyJeg-b6otF45Um6z9J-z1zdgxo",
  authDomain: "sheet-music-app-a08d1.firebaseapp.com",
  projectId: "sheet-music-app-a08d1",
  storageBucket: "sheet-music-app-a08d1.firebasestorage.app",
  messagingSenderId: "683700162613",
  appId: "1:683700162613:web:e80a032d6e4018094d217c",
  measurementId: "G-L7048844LK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState(null);
  const [tag, setTag] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [files, setFiles] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [filterTag, setFilterTag] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) loadFiles(u.uid, true);
    });
    return () => unsubscribe();
  }, []);

  const signUp = () => {
    createUserWithEmailAndPassword(auth, email, password).catch(alert);
  };

  const login = () => {
    signInWithEmailAndPassword(auth, email, password).catch(alert);
  };

  const logout = () => {
    signOut(auth);
    setFiles([]);
  };

  const upload = async () => {
    if (!file || !user) return;
    const storageRef = ref(storage, `scores/${user.uid}/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await setDoc(doc(db, "scores", `${user.uid}_${file.name}`), {
      uid: user.uid,
      name: file.name,
      tag,
      isPublic,
      url
    });
    setFile(null);
    setTag("");
    setIsPublic(false);
    loadFiles(user.uid, showAll);
  };

  const loadFiles = async (uid, all) => {
    const q = all
      ? query(collection(db, "scores"))
      : query(collection(db, "scores"), where("uid", "==", uid));
    const snapshot = await getDocs(q);
    let fileList = snapshot.docs.map(doc => doc.data());
    if (filterTag) {
      fileList = fileList.filter(f => f.tag && f.tag.includes(filterTag));
    }
    setFiles(fileList);
  };

  const deleteFile = async (name) => {
    await deleteDoc(doc(db, "scores", `${user.uid}_${name}`));
    setFiles(files.filter(f => f.name !== name));
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white shadow-md rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">🎼 나만의 악보 저장소</h1>

        {!user ? (
          <div className="space-y-4">
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 w-full"
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 w-full"
            />
            <div className="flex gap-2 justify-center">
              <button onClick={signUp} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl">
                회원가입
              </button>
              <button onClick={login} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl">
                로그인
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-700">👋 {user.email}</p>
              <button onClick={logout} className="text-sm bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded">
                로그아웃
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <input type="file" onChange={(e) => setFile(e.target.files[0])} className="block w-full" />
              <input
                placeholder="태그 (예: 재즈, 발라드)"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 w-full"
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                공개 여부
              </label>
              <button
                onClick={upload}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl w-full"
              >
                업로드
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 mb-4">
              <input
                placeholder="태그 필터"
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 w-full"
              />
              <button onClick={() => loadFiles(user.uid, showAll)} className="bg-blue-500 text-white px-3 py-2 rounded-xl">
                필터 적용
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm mb-4">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => {
                  setShowAll(e.target.checked);
                  loadFiles(user.uid, e.target.checked);
                }}
              />
              전체 공개 악보 보기 (관리자 모드)
            </label>

            <div className="space-y-4">
              {files.map((f) => (
                <div key={f.name} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800">🎵 {f.name}</p>
                      <p className="text-xs text-gray-500">태그: {f.tag || "없음"} | 공개: {f.isPublic ? "O" : "X"}</p>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        열기
                      </a>
                      {f.name.endsWith(".pdf") && (
                        <button
                          className="text-purple-600 hover:underline"
                          onClick={() => setPdfUrl(f.url)}
                        >미리보기</button>
                      )}
                      {user.uid === f.uid && (
                        <button className="text-red-500 hover:underline" onClick={() => deleteFile(f.name)}>삭제</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {pdfUrl && (
              <div className="mt-6 p-4 border rounded-xl bg-white shadow">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-gray-700">PDF 미리보기</h2>
                  <button onClick={() => setPdfUrl(null)} className="text-sm text-red-500 hover:underline">닫기</button>
                </div>
                <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={console.error}>
                  {Array.from(new Array(numPages), (el, index) => (
                    <Page key={`page_${index + 1}`} pageNumber={index + 1} className="mb-4" />
                  ))}
                </Document>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

