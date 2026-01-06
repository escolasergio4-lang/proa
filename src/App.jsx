import React, { useState, useEffect, useRef } from 'react';
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { jsPDF } from "jspdf";
import { 
  Plus, BookOpen, Trash2, User, Download, UploadCloud, 
  Camera, ChevronRight, Save, RotateCcw, AlertCircle, CheckCircle2,
  Lightbulb, FileText, Info, Filter, Settings, School, Anchor, HeartHandshake, Smartphone
} from 'lucide-react';

// --- 1. BANCO DE DADOS ---
const db = new Dexie('EloLetradoDB');
db.version(2).stores({
  students: '++id, name, created_at', 
  assessments: '++id, studentId, date',
  settings: 'id'
});

// --- 2. CONSTANTES ---
const REFERENCES = [
  "FERREIRO, Emilia; TEBEROSKY, Ana. Psicogênese da Língua Escrita.",
  "SOARES, Magda. Alfaletrar: toda criança pode aprender a ler e a escrever.",
  "SIMONETTI, Amália. Proposta Didática para Alfabetizar Letrando."
];

const SUGGESTIONS = {
  'ps-indiferenciado': { label: 'Pré-Silábico (Indiferenciado)', desc: 'Não diferencia desenho de escrita.', intervention: 'USO DE CRACHÁS E LISTAS. Leitura de Deleite, uso do nome próprio.' },
  'ps-realismo-nominal': { label: 'Pré-Silábico (Realismo Nominal)', desc: 'Acredita que escrita reflete tamanho do objeto.', intervention: 'TEXTOS DE MEMÓRIA. Comparar palavras grandes e pequenas.' },
  'ps-repertorio-fixo': { label: 'Pré-Silábico (Repertório Fixo)', desc: 'Usa sempre as mesmas letras.', intervention: 'ALFABETO MÓVEL. Montar palavras significativas.' },
  'ps-variacao': { label: 'Pré-Silábico (Com Variação)', desc: 'Usa letras diferentes, sem pauta sonora.', intervention: 'CONSCIÊNCIA FONOLÓGICA. Rimas e aliterações.' },
  'silabico-sem-valor': { label: 'Silábico (Sem Valor)', desc: 'Uma letra por sílaba, sem som correto.', intervention: 'ANÁLISE DE PALAVRAS. Contar sílabas e identificar vogais.' },
  'silabico-valor-vogal': { label: 'Silábico com Valor (Vogais)', desc: 'Usa vogais (A A para C A S A).', intervention: 'BANCO DE PALAVRAS. Comparar palavras com vogais iguais.' },
  'silabico-valor-consoante': { label: 'Silábico com Valor (Consoantes)', desc: 'Usa consoantes (K S para C A S A).', intervention: 'CRUZADINHAS E LACUNAS. Completar letras faltantes.' },
  'silabico-alfabetico': { label: 'Silábico-Alfabético', desc: 'Mistura sílabas e letras.', intervention: 'REESCRITA E DITADO. Escrever frases e corrigir coletivamente.' },
  'alfabetico-fonetico': { label: 'Alfabético (Fonético)', desc: 'Escreve como fala (KAZA).', intervention: 'LEITURA E COMPARAÇÃO. Comparar escrita com a do livro.' },
  'alfabetico-ortografico': { label: 'Alfabético (Ortográfico)', desc: 'Domina o sistema e regras.', intervention: 'PRODUÇÃO TEXTUAL. Cartas, bilhetes e revisão.' }
};

// --- 3. COMPONENTES ---

const SettingsView = ({ config, setConfig, setView, saveConfig }) => (
  <div className="p-4 max-w-md mx-auto pt-10">
    <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2"><School className="text-blue-600" /> Dados Institucionais</h2>
    <div className="space-y-4">
      <div><label className="block text-sm font-bold text-gray-700 mb-1">Escola</label><input value={config.school} onChange={e => setConfig({...config, school: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
      <div><label className="block text-sm font-bold text-gray-700 mb-1">Professor(a)</label><input value={config.teacher} onChange={e => setConfig({...config, teacher: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
      <div className="flex gap-4">
        <div className="flex-1"><label className="block text-sm font-bold text-gray-700 mb-1">Turma</label><input value={config.class} onChange={e => setConfig({...config, class: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
        <div className="flex-1"><label className="block text-sm font-bold text-gray-700 mb-1">Unidade</label><input value={config.unit} onChange={e => setConfig({...config, unit: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
      </div>
    </div>
    <div className="flex gap-3 mt-8">
      <button onClick={() => setView('list')} className="flex-1 p-4 bg-gray-100 rounded-xl text-gray-600">Cancelar</button>
      <button onClick={saveConfig} className="flex-1 p-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Salvar</button>
    </div>
  </div>
);

const StudentList = ({ students, config, setView, setCurrentStudent, deleteStudent, exportBackup, importBackup, installPrompt, handleInstall }) => (
  <div className="p-4 max-w-2xl mx-auto pb-32">
    <header className="mb-6 text-center pt-6 relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <button onClick={() => setView('settings')} className="absolute right-4 top-4 text-gray-400 hover:text-blue-600 p-2"><Settings size={24} /></button>
      <div className="flex flex-col items-center justify-center">
        <div className="bg-blue-600 text-white p-3 rounded-2xl mb-3 shadow-lg transform rotate-3"><Anchor size={32} /></div>
        <h1 className="text-4xl font-black text-gray-800 tracking-tight">PROA</h1>
        <p className="text-blue-600 font-bold text-xs uppercase tracking-wider mt-1">Prática de Orientação na Alfabetização</p>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 text-gray-500 text-sm">
        {config.school ? <p className="font-medium">{config.school} | {config.teacher}</p> : <p className="italic text-gray-400" onClick={() => setView('settings')}>Configurar escola</p>}
      </div>
    </header>
    
    {/* BOTÃO DE INSTALAÇÃO (PWA) */}
    {installPrompt && (
      <button onClick={handleInstall} className="w-full bg-green-600 text-white p-3 rounded-xl shadow-md flex items-center justify-center gap-2 mb-6 hover:bg-green-700 transition animate-pulse">
        <Smartphone size={20} /> Instalar Aplicativo no Celular
      </button>
    )}

    <button onClick={() => setView('new_student')} className="w-full bg-blue-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-center gap-2 mb-8 hover:bg-blue-700 transition"><Plus size={24} /> Novo Aluno</button>
    
    <div className="space-y-4 mb-12">
      {students.length === 0 && <p className="text-center text-gray-400 py-4 italic">Turma vazia.</p>}
      {students.map(student => (
        <div key={student.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
          <div onClick={() => { setCurrentStudent(student); setView('portfolio'); }} className="cursor-pointer flex-1 flex items-center gap-3">
            <div className="bg-blue-50 p-3 rounded-full text-blue-600"><User size={20} /></div>
            <div><h3 className="font-bold text-lg text-gray-800">{student.name}</h3><p className="text-xs text-gray-400">Acessar Portfólio</p></div>
          </div>
          <button onClick={() => deleteStudent(student.id)} className="text-red-300 hover:text-red-500 p-2"><Trash2 size={20} /></button>
        </div>
      ))}
    </div>

    <div className="bg-gray-100 rounded-xl p-4 mb-8 border border-gray-200">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-2 text-xs uppercase"><Info size={14}/> Base Teórica</h3>
        <ul className="text-xs text-gray-600 space-y-1 italic">{REFERENCES.map((ref, i) => <li key={i}>• {ref}</li>)}</ul>
    </div>

    <div className="text-center text-gray-400 text-xs pb-4">
        <div className="flex items-center justify-center gap-2 mb-1 text-gray-500 font-semibold"><HeartHandshake size={14} /><span>Da sala de aula para a sala de aula</span></div>
        <p>Desenvolvido por <strong>Prof. Sérgio</strong></p>
    </div>

    <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 flex justify-around items-center text-xs text-gray-600 shadow-up z-50">
      <button onClick={exportBackup} className="flex flex-col items-center gap-1 hover:text-blue-600"><Download size={20} /> Backup</button>
      <label className="flex flex-col items-center gap-1 hover:text-green-600 cursor-pointer"><UploadCloud size={20} /> Restaurar<input type="file" accept=".json" onChange={importBackup} className="hidden" /></label>
    </div>
  </div>
);

const NewStudent = ({ addStudent, setView }) => {
  const [name, setName] = useState('');
  return (
    <div className="p-4 max-w-md mx-auto pt-10">
       <h2 className="text-2xl font-bold mb-6 text-gray-800">Novo Aluno</h2>
       <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo..." className="w-full p-4 border rounded-xl mb-4 text-lg outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
       <div className="flex gap-3"><button onClick={() => setView('list')} className="flex-1 p-4 bg-gray-100 rounded-xl text-gray-600">Cancelar</button><button onClick={() => { if(name) addStudent(name); }} className="flex-1 p-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Salvar</button></div>
    </div>
  )
};

const AssessmentWizard = ({ currentStudent, setView }) => {
  const [step, setStep] = useState(1);
  const [obs, setObs] = useState('');
  const [photo, setPhoto] = useState(null);
  const fileInputRef = useRef(null);
  const [tempResult, setTempResult] = useState(null);

  const handlePhoto = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setPhoto(reader.result); reader.readAsDataURL(file); }};
  const next = (choice) => {
    if (step === 1) { if (choice === 'nao') return finalize('ps-indiferenciado'); if (choice === 'sim') return setStep(2); }
    if (step === 2) { if (choice === 'leitura-segmentada') return setStep(5); if (choice === 'leitura-global') return setStep(3); }
    if (step === 3) { if (choice === 'realismo') return finalize('ps-realismo-nominal'); if (choice === 'fixo') return finalize('ps-repertorio-fixo'); if (choice === 'variacao') return finalize('ps-variacao'); }
    if (step === 5) { if (choice === 'sem-valor') return finalize('silabico-sem-valor'); if (choice === 'com-valor') return setStep(6); }
    if (step === 6) { if (choice === 'vogais') return finalize('silabico-valor-vogal'); if (choice === 'consoantes') return finalize('silabico-valor-consoante'); if (choice === 'transicao') return finalize('silabico-alfabetico'); if (choice === 'alfabetico') return setStep(7); }
    if (step === 7) { if (choice === 'fonetico') return finalize('alfabetico-fonetico'); if (choice === 'ortografico') return finalize('alfabetico-ortografico'); }
  };
  const finalize = (level) => { setTempResult(level); setStep('review'); };
  const saveToDb = async () => { await db.assessments.add({ studentId: currentStudent.id, date: new Date().toISOString(), level: tempResult, notes: obs, photo: photo }); setView('portfolio'); };
  const Option = ({ onClick, label, desc }) => ( <button onClick={onClick} className="w-full bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-left hover:border-blue-400 hover:shadow-md transition group"><div className="flex justify-between items-center mb-1"><span className="font-bold text-gray-800 group-hover:text-blue-700">{label}</span><ChevronRight className="text-gray-300 group-hover:text-blue-500" size={20} /></div>{desc && <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>}</button> );

  if (step === 'review') return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-2 text-green-700 flex items-center gap-2"><CheckCircle2 /> Diagnóstico Concluído</h2>
      <div className="bg-green-50 p-4 rounded-xl border border-green-200 mb-6"><p className="text-sm text-green-800 font-semibold uppercase tracking-wider">Hipótese:</p><p className="text-lg font-bold text-gray-800 mt-1">{SUGGESTIONS[tempResult].label}</p></div>
      <div className="space-y-4 mb-6">
        <label className="block text-sm font-medium text-gray-700">Evidência (Foto)</label>
        <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white">
          {photo ? <img src={photo} alt="Preview" className="max-h-48 rounded object-contain" /> : <><Camera size={32} className="text-gray-400 mb-2" /><span className="text-gray-500 text-sm">Adicionar foto</span></>}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>
        <textarea value={obs} onChange={e => setObs(e.target.value)} className="w-full p-3 border rounded-xl bg-white" rows="3" placeholder="Observações..." />
      </div>
      <button onClick={saveToDb} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"><Save size={20} /> Salvar</button>
      <button onClick={() => setView('list')} className="w-full mt-4 text-gray-500 py-2">Cancelar</button>
    </div>
  );
  return (
    <div className="p-4 max-w-md mx-auto h-screen flex flex-col bg-gray-50">
      <div className="flex-1">
        <div className="mb-6 flex items-center gap-2"><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">Passo {step}</span><span className="text-xs text-gray-400">Investigação</span></div>
        <h2 className="text-xl font-bold text-gray-800 mb-6">{step === 1 ? "Usa símbolos convencionais ou rabiscos?" : step === 2 ? "Como realiza a leitura?" : step === 3 ? "Hipótese Pré-Silábica:" : step === 5 ? "Existe relação sonora?" : step === 6 ? "Qualidade da relação sonora:" : "Hipótese Alfabética:"}</h2>
        <div className="space-y-3">
          {step === 1 && <><Option onClick={() => next('sim')} label="Usa Letras" desc="Grafismos convencionais." /><Option onClick={() => next('nao')} label="Rabiscos" desc="Garatujas." /></>}
          {step === 2 && <><Option onClick={() => next('leitura-segmentada')} label="Leitura Segmentada" desc="Aponta cada sílaba." /><Option onClick={() => next('leitura-global')} label="Leitura Global" desc="Lê direto." /></>}
          {step === 3 && <><Option onClick={() => next('realismo')} label="Realismo Nominal" desc="Tamanho objeto = tamanho palavra." /><Option onClick={() => next('fixo')} label="Repertório Fixo" desc="Mesmas letras sempre." /><Option onClick={() => next('variacao')} label="Variação" desc="Letras variadas." /></>}
          {step === 5 && <><Option onClick={() => next('sem-valor')} label="Sem Valor Sonoro" desc="Letras aleatórias." /><Option onClick={() => next('com-valor')} label="Com Valor Sonoro" desc="Letras correspondem ao som." /></>}
          {step === 6 && <><Option onClick={() => next('vogais')} label="Vogais" desc="Ex: A A (BOLA)" /><Option onClick={() => next('consoantes')} label="Consoantes" desc="Ex: B L (BOLA)" /><Option onClick={() => next('transicao')} label="Silábico-Alfabético" desc="Mistura sílabas e letras." /><Option onClick={() => next('alfabetico')} label="Alfabético" desc="Escrita completa." /></>}
          {step === 7 && <><Option onClick={() => next('fonetico')} label="Fonético" desc="Como fala." /><Option onClick={() => next('ortografico')} label="Ortográfico" desc="Regras." /></>}
        </div>
      </div>
      <button onClick={() => setView('list')} className="text-gray-400 py-6 text-sm">Cancelar</button>
    </div>
  );
};

const Portfolio = ({ currentStudent, history, setView, config }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const filteredHistory = history.filter(item => {
      if (!startDate && !endDate) return true;
      const itemDate = item.date.split('T')[0];
      const start = startDate || '0000-00-00';
      const end = endDate || '9999-99-99';
      return itemDate >= start && itemDate <= end;
  });

  const generatePDF = () => {
    const doc = new jsPDF();
    const margin = 15;
    let y = 20;

    doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(41, 98, 255);
    doc.text("PROA", margin, y);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
    doc.text("Prática de Orientação na Alfabetização", margin + 25, y); y += 10;
    
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(50);
    doc.text(config.school || "Escola Não Informada", margin, y); y += 7;
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text(`Professor(a): ${config.teacher || "---"} | Turma: ${config.class || "---"}`, margin, y); y += 6;
    doc.text(`Unidade: ${config.unit || "---"}`, margin, y); y += 10;
    doc.setDrawColor(200); doc.line(margin, y, 195, y); y += 10;

    doc.setFontSize(14); doc.setTextColor(0); doc.setFont("helvetica", "bold");
    doc.text(`Portfólio: ${currentStudent.name}`, margin, y); y += 7;
    doc.setFontSize(10); doc.setTextColor(80); doc.setFont("helvetica", "normal");
    
    if (startDate || endDate) {
        const s = startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Início';
        const e = endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Hoje';
        doc.text(`Período: ${s} a ${e}`, margin, y);
    } else { doc.text(`Histórico Completo`, margin, y); }
    y += 10;

    if (filteredHistory.length === 0) doc.text("Nenhum registro.", margin, y);

    filteredHistory.forEach((item) => {
      if (y > 230) { doc.addPage(); y = 20; }
      const date = new Date(item.date).toLocaleDateString('pt-BR');
      
      doc.setDrawColor(230); doc.setFillColor(250, 250, 255); doc.rect(margin, y - 5, 180, 8, 'F');
      doc.setFontSize(10); doc.setTextColor(0); doc.setFont("helvetica", "bold");
      doc.text(`${date}  -  ${SUGGESTIONS[item.level].label}`, margin + 2, y); y += 8;

      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(50);
      const splitDesc = doc.splitTextToSize(SUGGESTIONS[item.level].desc, 175);
      doc.text(splitDesc, margin, y); y += (splitDesc.length * 5) + 4;

      doc.setFont("helvetica", "bold"); doc.setTextColor(0, 100, 0); doc.text("Intervenção:", margin, y); y += 5;
      doc.setFont("helvetica", "normal"); doc.setTextColor(0);
      const splitInt = doc.splitTextToSize(SUGGESTIONS[item.level].intervention, 175);
      doc.text(splitInt, margin, y); y += (splitInt.length * 5) + 4;

      if (item.notes) {
        doc.setFont("helvetica", "italic"); doc.setTextColor(80);
        const splitNotes = doc.splitTextToSize(`Obs: ${item.notes}`, 175);
        doc.text(splitNotes, margin, y); y += (splitNotes.length * 5) + 5;
      }
      if (item.photo) {
        try { if (y > 200) { doc.addPage(); y = 20; } doc.addImage(item.photo, "JPEG", margin, y, 40, 30); y += 35; } catch (e) { y += 5; }
      } else { y += 5; }
      y += 5;
    });

    doc.save(`Portfolio_${currentStudent.name}.pdf`);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto min-h-screen bg-gray-50 pb-20">
      <div className="flex items-center gap-2 mb-6 text-gray-600 cursor-pointer hover:text-blue-600 transition" onClick={() => setView('list')}><RotateCcw size={18} /> Voltar</div>
      <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div><h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2"><User className="text-blue-500" /> {currentStudent.name}</h1><p className="text-gray-500 text-sm">{config.class ? `${config.class} - ` : ''} {config.school}</p></div>
              <button onClick={() => setView('assess')} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow hover:bg-blue-700 flex items-center gap-2 mt-4 md:mt-0"><Plus size={20} /> Avaliar</button>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col md:flex-row gap-3 items-center">
              <div className="flex items-center gap-2 text-sm text-gray-600 font-semibold"><Filter size={16} /> Recorte:</div>
              <div className="flex gap-2 w-full md:w-auto"><input type="date" className="p-2 border rounded text-sm w-full md:w-auto" value={startDate} onChange={(e) => setStartDate(e.target.value)} /><span className="self-center text-gray-400">até</span><input type="date" className="p-2 border rounded text-sm w-full md:w-auto" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              <button onClick={generatePDF} className="bg-red-500 text-white px-3 py-2 rounded-lg font-bold shadow hover:bg-red-600 flex items-center gap-2 text-sm w-full md:w-auto justify-center md:ml-auto"><FileText size={16} /> Baixar PDF</button>
          </div>
      </header>
      <div className="relative border-l-2 border-blue-200 ml-4 space-y-10 pb-10">
        {filteredHistory.length === 0 && <div className="ml-10 p-6 bg-white rounded-xl italic text-gray-400">Sem registros no período.</div>}
        {filteredHistory.map((item) => (
          <div key={item.id} className="ml-10 relative group">
            <div className="absolute -left-[49px] top-0 bg-white w-5 h-5 rounded-full border-4 border-blue-500 shadow-sm z-10"></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4"><span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100">{new Date(item.date).toLocaleDateString('pt-BR')}</span></div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{SUGGESTIONS[item.level].label}</h3>
              <p className="text-sm text-gray-600 mb-5 leading-relaxed border-b border-gray-100 pb-4">{SUGGESTIONS[item.level].desc}</p>
              {item.photo && <div className="mb-5 rounded-xl overflow-hidden border border-gray-200 bg-gray-50"><img src={item.photo} alt="Atividade" className="w-full object-contain max-h-80" /></div>}
              {item.notes && <div className="bg-yellow-50 p-4 rounded-xl mb-5 text-sm text-yellow-800 border border-yellow-100 italic flex gap-2"><AlertCircle size={16} className="mt-1 flex-shrink-0" /> "{item.notes}"</div>}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100"><strong className="text-blue-800 text-xs uppercase block mb-2 flex items-center gap-2"><Lightbulb size={16} /> Intervenção:</strong><p className="text-gray-700 text-sm leading-relaxed">{SUGGESTIONS[item.level].intervention}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('list');
  const [currentStudent, setCurrentStudent] = useState(null);
  const students = useLiveQuery(() => db.students.orderBy('name').toArray(), []) || [];
  const [history, setHistory] = useState([]);
  const [config, setConfig] = useState({ school: '', teacher: '', class: '', unit: '' });
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => { db.settings.get('global_config').then(data => { if (data) setConfig(data); }); }, []);
  useEffect(() => { if (currentStudent) { db.assessments.where({ studentId: currentStudent.id }).reverse().sortBy('date').then(data => setHistory(data)); } }, [currentStudent, view]);
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') setInstallPrompt(null);
    });
  };

  const addStudent = async (name) => { await db.students.add({ name, created_at: new Date().toISOString() }); setView('list'); };
  const deleteStudent = async (id) => { if(confirm('Apagar aluno?')) { await db.students.delete(id); await db.assessments.where({ studentId: id }).delete(); } };
  const saveConfig = async () => { await db.settings.put({ id: 'global_config', ...config }); alert('Salvo!'); setView('list'); };
  const exportBackup = async () => { const data = { version: 6, exportedAt: new Date().toISOString(), students: await db.students.toArray(), assessments: await db.assessments.toArray(), settings: await db.settings.toArray() }; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], {type : 'application/json'})); a.download = 'backup_proa.json'; a.click(); };
  const importBackup = async (e) => { const file = e.target.files[0]; if (!file || !confirm('Mesclar?')) return; const reader = new FileReader(); reader.onload = async (ev) => { const d = JSON.parse(ev.target.result); await db.transaction('rw', db.students, db.assessments, db.settings, async () => { if(d.students) await db.students.bulkPut(d.students); if(d.assessments) await db.assessments.bulkPut(d.assessments); if(d.settings) await db.settings.bulkPut(d.settings); }); window.location.reload(); }; reader.readAsText(file); };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-blue-200">
      {view === 'list' && <StudentList students={students} config={config} setView={setView} setCurrentStudent={setCurrentStudent} deleteStudent={deleteStudent} exportBackup={exportBackup} importBackup={importBackup} installPrompt={installPrompt} handleInstall={handleInstall} />}
      {view === 'new_student' && <NewStudent addStudent={addStudent} setView={setView} />}
      {view === 'assess' && <AssessmentWizard currentStudent={currentStudent} setView={setView} />}
      {view === 'portfolio' && <Portfolio currentStudent={currentStudent} history={history} setView={setView} config={config} />}
      {view === 'settings' && <SettingsView config={config} setConfig={setConfig} setView={setView} saveConfig={saveConfig} />}
    </div>
  );
}