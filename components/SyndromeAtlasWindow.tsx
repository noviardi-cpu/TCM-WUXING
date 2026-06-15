
import React, { useMemo, useState } from "react";
import {
  Activity, Search, Thermometer, SunMedium, Snowflake, Droplets, Flame, Wind,
  BrainCircuit, ArrowRightCircle, Leaf, Filter, AlertCircle, Layers, Grid,
  X, Crosshair
} from "lucide-react";
import { TCM_DB } from "../constants";

type QuadrantId = "DEF_COLD" | "DEF_HEAT" | "EXCESS_COLD" | "EXCESS_HEAT" | "OTHER_DEF" | "OTHER_EXCESS" | "OTHER";

interface Props {
  onSelectSyndrome?: (id: string) => void;
}

const elementColors: Record<string, string> = {
  Wood: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  Fire: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  Earth: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  Metal: "text-slate-100 border-slate-400/30 bg-slate-400/10",
  Water: "text-blue-400 border-blue-500/30 bg-blue-500/10",
};

function classifyQuadrant(patternType: string): QuadrantId {
  const t = (patternType || "").toLowerCase();
  const isDef = t.includes("def") || t.includes("empty");
  const isExcess = t.includes("full") || t.includes("excess") || t.includes("invasion") || t.includes("stagnation");
  const isHeat = t.includes("heat") || t.includes("fire");
  const isCold = t.includes("cold");

  if (isDef && isCold) return "DEF_COLD";
  if (isDef && isHeat) return "DEF_HEAT";
  if (isExcess && isCold) return "EXCESS_COLD";
  if (isExcess && isHeat) return "EXCESS_HEAT";
  if (isDef) return "OTHER_DEF";
  if (isExcess) return "OTHER_EXCESS";
  return "OTHER";
}

export const SyndromeAtlasWindow: React.FC<Props> = ({ onSelectSyndrome }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeElement, setActiveElement] = useState<string>("ALL");
  const [activeQuadrant, setActiveQuadrant] = useState<QuadrantId | "ALL">("ALL");

  const allSyndromes = useMemo(() => {
    return Array.from(
      new Map(
        [
          ...(TCM_DB.syndromes.FILLED_FROM_PDF || []),
          ...(TCM_DB.syndromes.TODO_FROM_PDF || [])
        ].map(s => [s.id, s])
      ).values()
    ).map(s => ({
      ...s,
      quadrant: classifyQuadrant(s.pattern_type)
    }));
  }, []);

  const filtered = useMemo(() => {
    return allSyndromes.filter(s => {
      const ms = searchTerm.toLowerCase();
      const matchSearch = s.name_id.toLowerCase().includes(ms) || 
                          (s.name_en || "").toLowerCase().includes(ms) ||
                          (s.clinical_manifestations || []).some(m => m.toLowerCase().includes(ms)) ||
                          (s.key_symptoms || []).some(k => k.toLowerCase().includes(ms));
      
      const matchElement = activeElement === "ALL" || (s.wuxing_element && s.wuxing_element.toLowerCase() === activeElement.toLowerCase());
      const matchQuadrant = activeQuadrant === "ALL" || s.quadrant === activeQuadrant;
      return matchSearch && matchElement && matchQuadrant;
    });
  }, [allSyndromes, searchTerm, activeElement, activeQuadrant]);

  const selected = filtered.find(s => s.id === selectedId) || null;

  const QuadrantHeader = ({ id, label, icon: Icon, color }: { id: QuadrantId, label: string, icon: any, color: string }) => (
    <button 
      onClick={() => setActiveQuadrant(activeQuadrant === id ? "ALL" : id)}
      className={`flex-none min-w-[100px] p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
        activeQuadrant === id ? `${color} border-current ring-1 ring-current shadow-sm` : "bg-white border-purple-200 text-purple-400 grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-[10px] font-black uppercase tracking-wider text-center leading-tight">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-purple-50 text-purple-900 overflow-hidden animate-fade-in relative relative">
      
      {/* FULL WIDTH HEADER & CONTROLS */}
      <div className="flex-none p-6 md:px-12 pt-8 border-b border-purple-200 bg-white">
        <h2 className="text-3xl font-black text-purple-800 flex items-center gap-3 mb-6">
          <Layers className="w-8 h-8 text-purple-600" /> Syndrome Atlas
        </h2>
        
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="relative flex-1">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
             <input 
                type="text"
                placeholder="Cari pola atau gejala..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-purple-50/50 border-2 border-purple-100 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-purple-400 focus:bg-white transition-all text-purple-900 placeholder-purple-300 font-medium"
             />
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
             <QuadrantHeader id="EXCESS_HEAT" label="Excess Heat" icon={Flame} color="text-rose-600 bg-rose-50" />
             <QuadrantHeader id="DEF_HEAT" label="Yin Def" icon={SunMedium} color="text-amber-600 bg-amber-50" />
             <QuadrantHeader id="EXCESS_COLD" label="Excess Cold" icon={Snowflake} color="text-blue-600 bg-blue-50" />
             <QuadrantHeader id="DEF_COLD" label="Yang Def" icon={Droplets} color="text-sky-600 bg-sky-50" />
             <QuadrantHeader id="OTHER_DEF" label="Qi/Blood Def" icon={Leaf} color="text-emerald-600 bg-emerald-50" />
             <QuadrantHeader id="OTHER_EXCESS" label="Stagnation" icon={Wind} color="text-purple-600 bg-purple-50" />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
           {["ALL", "Wood", "Fire", "Earth", "Metal", "Water"].map(el => (
             <button 
              key={el}
              onClick={() => setActiveElement(el)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all shadow-sm border ${
                activeElement === el ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-purple-200 text-purple-600 hover:bg-purple-50"
              }`}
             >
               {el}
             </button>
           ))}
        </div>
      </div>

      {/* FULL WIDTH GRID VIEW */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 scroll-smooth bg-purple-50/30">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
            {filtered.map(s => (
               <button 
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="text-left bg-white p-5 rounded-3xl transition-all border border-purple-100 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-900/5 group flex flex-col h-full"
               >
                 <div className="flex justify-between items-start mb-3 gap-2">
                    <span className="font-bold text-lg text-purple-900 group-hover:text-purple-600 transition-colors leading-tight">{s.name_id}</span>
                    {s.wuxing_element && (
                      <span className={`text-[9px] shrink-0 font-black uppercase px-2 py-1 rounded border ${elementColors[s.wuxing_element] || 'text-purple-500 bg-purple-50 border-purple-100'}`}>
                         {s.wuxing_element}
                      </span>
                    )}
                 </div>
                 
                 <div className="mb-4 flex-1">
                    <p className="text-sm text-purple-500 italic leading-snug">{s.name_en}</p>
                 </div>

                 <div className="flex flex-wrap gap-1 mt-auto pt-4 border-t border-purple-50">
                    {(s.primary_organs || []).map(org => (
                      <span key={org} className="text-[10px] px-2 py-1 bg-purple-50 text-purple-600 rounded-md font-bold">{org}</span>
                    ))}
                 </div>
               </button>
            ))}
          </div>
        ) : (
           <div className="h-full flex flex-col items-center justify-center text-purple-300">
              <AlertCircle className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-sm font-bold uppercase tracking-widest text-purple-400">No patterns found</p>
           </div>
        )}
      </div>

      {/* MODAL DETAILED VIEW */}
      {selected && (
        <div className="absolute inset-0 z-50 flex justify-end bg-purple-900/20 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
            
            {/* Modal Header */}
            <div className="flex-none p-6 md:p-8 border-b border-purple-100 flex justify-between items-start bg-purple-50/50">
              <div>
                <div className="flex items-center gap-4 mb-2">
                   <h1 className="text-3xl md:text-4xl font-black text-purple-900 uppercase tracking-tight">{selected.name_id}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                   <span className="text-lg text-purple-600 font-medium italic">{selected.name_en}</span>
                   {selected.name_zh && (
                     <>
                       <span className="h-1.5 w-1.5 rounded-full bg-purple-300"></span>
                       <span className="text-lg text-purple-500 font-medium">{selected.name_zh}</span>
                     </>
                   )}
                   {selected.name_pinyin && (
                     <>
                       <span className="h-1.5 w-1.5 rounded-full bg-purple-300"></span>
                       <span className="text-sm text-purple-400">{selected.name_pinyin}</span>
                     </>
                   )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white bg-purple-400 px-3 py-1 rounded-full">{selected.pattern_type.replace(/_/g, ' ')}</span>
                   {selected.wuxing_element && (
                     <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${elementColors[selected.wuxing_element] || 'text-purple-600 bg-white border-purple-200'}`}>{selected.wuxing_element}</span>
                   )}
                </div>
              </div>

              <div className="flex gap-2">
                {onSelectSyndrome && (
                  <button 
                    onClick={() => onSelectSyndrome(selected.id)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-black text-sm shadow-lg shadow-purple-900/10 transition-all active:scale-95"
                  >
                    <ArrowRightCircle className="w-4 h-4" /> Analyze
                  </button>
                )}
                <button 
                  onClick={() => setSelectedId(null)} 
                  className="p-2.5 bg-white border border-purple-100 hover:bg-purple-50 rounded-xl text-purple-400 hover:text-purple-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scroll-smooth scrollbar-hide bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Visual / Clinical */}
                <div className="space-y-8">
                  <section>
                     <h3 className="text-xs font-black text-purple-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       <Thermometer className="w-4 h-4" /> Clinical Signs
                     </h3>
                     <ul className="space-y-3 bg-purple-50/50 p-6 rounded-3xl border border-purple-100">
                        {(selected.clinical_manifestations || []).map((m, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-purple-800">
                             <div className="w-1.5 h-1.5 bg-purple-400 rounded-full shrink-0 mt-1.5" />
                             {m}
                          </li>
                        ))}
                     </ul>
                  </section>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                        <span className="text-[10px] font-black text-rose-400 uppercase block mb-1">Tongue</span>
                        <p className="text-sm text-rose-900 font-bold">{(selected.tongue || []).join(' • ') || 'N/A'}</p>
                     </div>
                     <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <span className="text-[10px] font-black text-blue-400 uppercase block mb-1">Pulse</span>
                        <p className="text-sm text-blue-900 font-bold">{(selected.pulse || []).join(' • ') || 'N/A'}</p>
                     </div>
                  </div>
                </div>

                {/* Treatment / Pearls */}
                <div className="space-y-6">
                  <section className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                     <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       <Crosshair className="w-4 h-4" /> Treatment Principle
                     </h3>
                     <div className="space-y-2">
                        {(selected.treatment_principle || []).map((p, i) => (
                          <div key={i} className="text-base font-bold text-emerald-900 leading-snug">
                             {p}
                          </div>
                        ))}
                     </div>
                  </section>

                  <section className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                     <h3 className="text-xs font-black text-amber-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       <Leaf className="w-4 h-4" /> Herbal Prescription
                     </h3>
                     <div className="text-base font-bold text-amber-900">
                        {selected.herbal_prescription || (
                          <span className="text-amber-500/50 italic font-normal">No specific herbal formula provided.</span>
                        )}
                     </div>
                  </section>

                  <section className="p-6 rounded-3xl border border-purple-100 bg-white shadow-sm">
                     <h3 className="text-xs font-black text-purple-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       <Activity className="w-4 h-4" /> Acupoints
                     </h3>
                     <div className="flex flex-wrap gap-2">
                        {(selected.acupuncture_points || []).map((pt: any) => (
                           <span key={pt} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-200 text-xs font-black">{pt}</span>
                        ))}
                     </div>
                     {selected.needling_method && (
                        <div className="mt-4 pt-4 border-t border-purple-50 text-sm text-purple-700">
                          <span className="font-bold text-purple-900 mr-2">Needling:</span>
                          {selected.needling_method}
                        </div>
                     )}
                  </section>
                  
                  {selected.diagnostic_tip && (
                    <section className="bg-purple-900 p-6 rounded-3xl text-purple-100">
                       <h3 className="text-xs font-black text-purple-300 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                         <BrainCircuit className="w-4 h-4" /> Clinical Pearls
                       </h3>
                       <p className="text-sm font-medium italic opacity-90">
                         "{selected.diagnostic_tip}"
                       </p>
                    </section>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SyndromeAtlasWindow;
