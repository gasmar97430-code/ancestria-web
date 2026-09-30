import React, { useState } from 'react';
import { TreeCanvas } from '../components/TreeCanvas';
import { RepertoirePatronymes } from '../components/RepertoirePatronymes';
import { BoutonTraque } from '../components/TraqueDesNoms';
import { usePatronymeStore } from '../store/usePatronymeStore';
import { useTreeStore } from '../store/useTreeStore';
import { UserPlus, Trees as TreeIcon } from 'lucide-react';
const FORMULAIRE_VIDE = { prenom: '', nom: '', genre: 'Unknown' };
export const Home = () => {
    const { addPerson } = useTreeStore();
    const { patronymes } = usePatronymeStore();
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(FORMULAIRE_VIDE);
    const ouvrirFormulaire = (nom = '') => {
        setFormData({ ...FORMULAIRE_VIDE, nom });
        setShowForm(true);
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addPerson(formData);
        setShowForm(false);
        setFormData(FORMULAIRE_VIDE);
    };
    return (<div className="flex h-screen w-screen overflow-hidden font-sans text-gray-900">
            
            <aside className="w-80 bg-white border-r border-gray-200 p-6 flex flex-col shadow-sm z-10">
                <div className="flex items-center gap-3 mb-10">
                    <div className="p-2 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg">
                        <TreeIcon className="text-white" size={24}/>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-800">Ancestria</h1>
                </div>

                <button onClick={() => ouvrirFormulaire()} className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shrink-0">
                    <UserPlus size={20}/>
                    Ajouter un membre
                </button>
                <BoutonTraque />

                <div className="mt-6 flex flex-col min-h-0 flex-1">
                    <RepertoirePatronymes onChoisir={ouvrirFormulaire}/>
                </div>
            </aside>

            
            <main className="flex-1 relative">
                <TreeCanvas />

                
                {showForm && (<div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
                            <h2 className="text-xl font-bold mb-6">Nouveau Membre</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                                    <input className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.prenom} onChange={e => setFormData({ ...formData, prenom: e.target.value })} required/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                                    <input className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} list="patronymes-reunionnais" required/>
                                    <datalist id="patronymes-reunionnais">
                                        {patronymes.map(p => (<option key={p.id} value={p.nom}/>))}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                                    <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.genre} onChange={e => setFormData({ ...formData, genre: e.target.value })}>
                                        <option value="Unknown">Inconnu</option>
                                        <option value="M">Masculin</option>
                                        <option value="F">Féminin</option>
                                        <option value="Other">Autre</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-all">
                                    Annuler
                                </button>
                                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-md">
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>)}
            </main>
        </div>);
};
