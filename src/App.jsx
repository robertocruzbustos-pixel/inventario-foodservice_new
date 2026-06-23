import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, LayoutDashboard, List, Plus, Search, AlertTriangle,
  Image as ImageIcon, UploadCloud, Printer, Trash2, Edit, X, Save, ChefHat, Camera, LogOut
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDFpFveD-2WdqHxcm_uVY8PhrVAaSqX4yg",
  authDomain: "foodservice-inventario.firebaseapp.com",
  projectId: "foodservice-inventario",
  storageBucket: "foodservice-inventario.firebasestorage.app",
  messagingSenderId: "228274277356",
  appId: "1:228274277356:web:8b198cf8a036d0b9d28ec9",
  measurementId: "G-J0RK53W69V"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const compressImage = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

const CATEGORIAS = ['Equipamiento', 'Bazar / Vajilla', 'Utensilios de Cocina'];

export default function App() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '', categoria: 'Equipamiento', cantidad: 0, stockMinimo: 5, descripcion: '', fotoBase64: '', marca: '', modelo: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error en login:", error);
      alert("Hubo un error al iniciar sesión.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (!user) return;
    const itemsRef = collection(db, 'inventario');
    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      (item.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [items, searchTerm]);

  const itemsEnAlerta = useMemo(() => items.filter(i => Number(i.cantidad) <= Number(i.stockMinimo)), [items]);

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    setFormData(item ? { ...item } : { nombre: '', categoria: 'Equipamiento', cantidad: 0, stockMinimo: 5, descripcion: '', fotoBase64: '', marca: '', modelo: '' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setFormData(prev => ({ ...prev, fotoBase64: compressed }));
    } catch (error) { alert("Error al procesar la imagen"); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const itemsRef = collection(db, 'inventario');
      const docRef = editingItem ? doc(itemsRef, editingItem.id) : doc(itemsRef);
      await setDoc(docRef, { ...formData, cantidad: Number(formData.cantidad), stockMinimo: Number(formData.stockMinimo), updated: serverTimestamp() }, { merge: true });
      handleCloseModal();
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar artículo?')) {
      await deleteDoc(doc(db, 'inventario', id));
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500">Cargando...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl max-w-md w-full border border-slate-800 shadow-2xl text-center">
          <div className="w-16 h-16 bg-emerald-600/20 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ChefHat size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Inventario FoodService</h1>
          <p className="text-slate-400 mb-8">Inicia sesión para gestionar el inventario</p>
          <button onClick={handleGoogleLogin} disabled={isLoggingIn} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
            {isLoggingIn ? 'Conectando...' : 'Continuar con Google'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-200">
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span className="text-emerald-500"><ChefHat size={24}/></span>
            FoodService
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 text-left p-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-600/20 text-emerald-500' : 'hover:bg-slate-800'}`}>
            <LayoutDashboard size={20} /> Panel de Control
          </button>
          <button onClick={() => setActiveTab('inventario')} className={`w-full flex items-center gap-3 text-left p-3 rounded-lg transition-colors ${activeTab === 'inventario' ? 'bg-emerald-600/20 text-emerald-500' : 'hover:bg-slate-800'}`}>
            <Package size={20} /> Catálogo
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 text-left p-3 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
            <LogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 bg-slate-900 border-b border-slate-800">
          <h2 className="font-semibold text-lg flex items-center gap-2">
             <span className="md:hidden text-emerald-500"><ChefHat size={20}/></span>
             {activeTab === 'dashboard' ? 'Panel de Control' : 'Catálogo'}
          </h2>
          <button onClick={() => handleOpenModal()} className="bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
             <Plus size={16} /> Nuevo
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {activeTab === 'dashboard' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
                   <p className="text-slate-400 mb-2 font-medium">Total Artículos</p>
                   <p className="text-4xl font-bold text-slate-100">{items.length}</p>
                </div>
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
                   <p className="text-slate-400 mb-2 font-medium">Alertas de Stock</p>
                   <p className="text-4xl font-bold text-rose-500">{itemsEnAlerta.length}</p>
                </div>
             </div>
          ) : (
             <div className="space-y-4">
               <div className="relative mb-6">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                 <input type="text" placeholder="Buscar artículo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-3 pl-10 pr-4 rounded-xl focus:border-emerald-500 outline-none" />
               </div>
               {filteredItems.map(i => (
                 <div key={i.id} className="bg-slate-900 p-4 rounded-xl flex justify-between items-center border border-slate-800 shadow-sm hover:border-emerald-500/50 transition-colors">
                   <div className="flex items-center gap-4">
                     {i.fotoBase64 ? (
                        <img src={i.fotoBase64} alt={i.nombre} className="w-12 h-12 rounded object-cover border border-slate-700" />
                     ) : (
                        <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center text-slate-500"><ImageIcon size={20}/></div>
                     )}
                     <div>
                       <p className="font-bold text-slate-200">{i.nombre}</p>
                       <p className="text-xs text-slate-500 mt-1">{i.categoria}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-4">
                     <div className="text-right hidden sm:block mr-4">
                        <p className="text-xs text-slate-500">Stock</p>
                        <p className={`font-bold ${Number(i.cantidad) <= Number(i.stockMinimo) ? 'text-rose-500' : 'text-slate-200'}`}>{i.cantidad}</p>
                     </div>
                     <button onClick={() => handleOpenModal(i)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"><Edit size={16} className="text-blue-400"/></button>
                     <button onClick={() => handleDelete(i.id)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"><Trash2 size={16} className="text-rose-500"/></button>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </main>

      {}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-3 z-40">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center ${activeTab === 'dashboard' ? 'text-emerald-500' : 'text-slate-500'}`}>
             <LayoutDashboard size={20} /> <span className="text-[10px] mt-1">Panel</span>
          </button>
          <button onClick={() => setActiveTab('inventario')} className={`flex flex-col items-center ${activeTab === 'inventario' ? 'text-emerald-500' : 'text-slate-500'}`}>
             <Package size={20} /> <span className="text-[10px] mt-1">Catálogo</span>
          </button>
          <button onClick={handleLogout} className="flex flex-col items-center text-slate-500 hover:text-rose-500">
             <LogOut size={20} /> <span className="text-[10px] mt-1">Salir</span>
          </button>
      </nav>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
           <form onSubmit={handleSave} className="bg-slate-900 p-6 rounded-2xl w-full max-w-sm border border-slate-700 shadow-2xl space-y-4">
             <h3 className="text-xl font-bold text-slate-100 mb-4">{editingItem ? 'Editar Artículo' : 'Nuevo Artículo'}</h3>
             
             <div className="flex justify-center mb-4">
                <label className="relative cursor-pointer group">
                  {formData.fotoBase64 ? (
                     <img src={formData.fotoBase64} className="w-24 h-24 rounded-xl object-cover border-2 border-slate-700 group-hover:border-emerald-500 transition-colors" alt="preview" />
                  ) : (
                     <div className="w-24 h-24 rounded-xl bg-slate-950 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 group-hover:border-emerald-500 transition-colors">
                        <Camera size={24} className="mb-1" />
                        <span className="text-[10px]">Añadir Foto</span>
                     </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
             </div>

             <input type="text" placeholder="Nombre del artículo" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-3 rounded-lg focus:border-emerald-500 outline-none" />
             <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-3 rounded-lg focus:border-emerald-500 outline-none">
               {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <div className="flex gap-4">
                <div className="flex-1">
                   <label className="text-xs text-slate-500 mb-1 block">Cantidad</label>
                   <input type="number" required value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-3 rounded-lg outline-none focus:border-emerald-500" />
                </div>
                <div className="flex-1">
                   <label className="text-xs text-slate-500 mb-1 block">Alerta Mínima</label>
                   <input type="number" required value={formData.stockMinimo} onChange={e => setFormData({...formData, stockMinimo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-3 rounded-lg outline-none focus:border-emerald-500" />
                </div>
             </div>
             
             <div className="flex gap-3 pt-4 mt-2 border-t border-slate-800">
               <button type="button" onClick={handleCloseModal} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors">Cancelar</button>
               <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center">
                  {isSaving ? 'Guardando...' : 'Guardar'}
               </button>
             </div>
           </form>
        </div>
      )}
    </div>
  );
}