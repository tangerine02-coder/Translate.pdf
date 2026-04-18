import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export default function App() {
  const getLocalStorage = (key: string) => {
    try {
      return localStorage.getItem(key) || '';
    } catch (e) {
      console.warn('LocalStorage is not available', e);
      return '';
    }
  };

  const [apiKey, setApiKey] = useState(() => getLocalStorage('geminiApiKey'));
  const [model, setModel] = useState('gemini-3.1-pro-preview');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const [originalMarkdown, setOriginalMarkdown] = useState('');
  const [translatedMarkdown, setTranslatedMarkdown] = useState('');
  
  const [notionApiKey, setNotionApiKey] = useState(() => getLocalStorage('notionApiKey'));
  const [notionPageId, setNotionPageId] = useState(() => getLocalStorage('notionPageId'));
  const [isExportingNotion, setIsExportingNotion] = useState(false);
  const [notionSuccessUrl, setNotionSuccessUrl] = useState('');
  
  const markdownRef = useRef<HTMLDivElement>(null);

  // Save to local storage whenever keys change
  useEffect(() => {
    try { localStorage.setItem('geminiApiKey', apiKey); } catch (e) {}
  }, [apiKey]);

  useEffect(() => {
    try { localStorage.setItem('notionApiKey', notionApiKey); } catch (e) {}
  }, [notionApiKey]);

  useEffect(() => {
    try { localStorage.setItem('notionPageId', notionPageId); } catch (e) {}
  }, [notionPageId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError('');
      setIsSuccess(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const downloadMarkdown = () => {
    if (!translatedMarkdown || !file) return;
    const blob = new Blob([translatedMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PL_${file.name.replace('.pdf', '')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTranslate = async () => {
    if (!file) {
      setError('Proszę wybrać plik PDF.');
      return;
    }
    if (!apiKey) {
      setError('Proszę podać klucz API Gemini.');
      return;
    }

    setIsProcessing(true);
    setIsSuccess(false);
    setError('');
    setTranslatedMarkdown('');
    setStatusText('Odczytywanie pliku PDF...');

    try {
      // 1. Read file as base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      setStatusText('Wysyłanie do modelu AI (to może potrwać kilka minut)...');

      // 2. Call Gemini API
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64,
                }
              },
              {
                text: 'Jesteś ekspertem w tłumaczeniu artykułów naukowych. Twoim zadaniem jest wyodrębnienie tekstu z PDF, pozbycie się śmieci oraz jego przetłumaczenie.\n\nZasady:\n1. WYCZYŚĆ ORYGINAŁ Z BŁĘDÓW OCR: Wyekstrahuj język angielski. Zachowaj oryginalne słownictwo, ALE bezwzględnie usun "śmieci" z odczytu PDF, tzn. przypadkowe i niepotrzebne znaki matematyczne/techniczne (np. ucięte litery, symbole $, &, !, nawiasy, ułamki, numery potęg). Oczyść z nich tekst, by był naturalnie czytelny, płynny i ciągły.\n2. PRZETŁUMACZ: Przetłumacz doczyszczony tekst na język polski (naukowy, naturalny styl).\n3. POMIŃ BIBLIOGRAFIĘ: Nie uwzględniaj sekcji References/Bibliography.\n4. PROSTE FORMATOWANIE: Nie używaj tabelek, znaczników kodu ani składni LaTeX. Używaj wyłącznie czystego tekstu ułożonego w akapity oraz głównych nagłówków.\n5. BARDZO WAŻNE: Zwróć wynik w dwóch częściach oddzielonych ciągiem znaków "===TRANSLATED===". Najpierw WYCZYSZCZONY oryginał, następnie "===TRANSLATED===", a pod spodem przetłumaczony tekst. Nie dodawaj niczego więcej.'
              }
            ]
          }
        ]
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Model nie zwrócił żadnego tekstu.');
      }

      let original = '';
      let translated = responseText;

      if (responseText.includes('===TRANSLATED===')) {
        const parts = responseText.split('===TRANSLATED===');
        original = parts[0].trim();
        translated = parts[1].trim();
      }

      setOriginalMarkdown(original);
      setTranslatedMarkdown(translated);
      setIsProcessing(false);
      setIsSuccess(true);

    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || 'Wystąpił błąd podczas tłumaczenia.';
      
      // Handle ugly JSON error strings from Gemini API (like 429 Quota Exceeded)
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = "Przekroczono darmowy limit użycia dla tego modelu. Zmień 'Model Tłumacza' na 'Gemini 3 Flash Preview' (ma znacznie większe darmowe limity) lub spróbuj ponownie jutro.";
      } else if (errorMessage.includes('{')) {
        try {
          const parsed = JSON.parse(errorMessage.substring(errorMessage.indexOf('{')));
          if (parsed.error && parsed.error.message) {
            errorMessage = parsed.error.message;
          }
        } catch (e) {
          // keep original if parsing fails
        }
      }

      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  const generatePdf = () => {
    if (!markdownRef.current || !file) return;

    setIsProcessing(true);
    setStatusText('Generowanie pliku PDF (to może chwilę potrwać)...');

    const element = markdownRef.current;
    const opt = {
      margin:       15,
      filename:     `PL_${file.name.replace('.pdf', '')}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsProcessing(false);
      setStatusText('');
    }).catch((err: any) => {
      console.error('PDF generation error:', err);
      setError('Błąd podczas generowania pliku PDF. Spróbuj pobrać plik tekstowy.');
      setIsProcessing(false);
    });
  };

  const exportToNotion = async () => {
    if (!notionApiKey || !notionPageId || !translatedMarkdown) {
      setError('Proszę podać klucz API Notion oraz ID Strony.');
      return;
    }

    setIsExportingNotion(true);
    setError('');
    setStatusText('Eksportowanie do Notion...');

    try {
      const response = await fetch('/api/notion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: notionApiKey,
          pageId: notionPageId,
          title: `Tłumaczenie: ${file?.name || 'Dokument'}`,
          originalMarkdown: originalMarkdown,
          translatedMarkdown: translatedMarkdown,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Błąd podczas eksportu do Notion');
      }

      setNotionSuccessUrl(data.url);
      setIsExportingNotion(false);
      setStatusText('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Wystąpił błąd podczas eksportu do Notion.');
      setIsExportingNotion(false);
      setStatusText('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#f2f2f5] font-sans relative overflow-x-hidden p-4 sm:p-8 flex justify-center items-center">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(139, 92, 246, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(45, 212, 191, 0.1) 0px, transparent 50%)'
      }}></div>
      <div className="fixed w-[40vw] h-[40vw] rounded-full blur-[80px] opacity-50 -top-[10%] -left-[10%] z-0 pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 60%)',
        animation: 'float 20s infinite alternate ease-in-out'
      }}></div>
      <div className="fixed w-[40vw] h-[40vw] rounded-full blur-[80px] opacity-50 -bottom-[10%] -right-[10%] z-0 pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, transparent 60%)',
        animation: 'float 20s infinite alternate ease-in-out',
        animationDelay: '-10s'
      }}></div>

      <main className="w-full max-w-2xl z-10 flex flex-col gap-6">
        <header className="text-center mb-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white to-[#a0a0b8] bg-clip-text text-transparent">
            Translate<span className="text-violet-500">.PDF</span>
          </h1>
          <p className="text-[#a0a0b8] text-sm sm:text-base">
            Inteligenty translator artykułów naukowych z zachowaniem formatu, omijający bibliografię.
          </p>
        </header>

        <section className="bg-[rgba(25,26,36,0.4)] backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-medium mb-4">Konfiguracja Silnika</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="api-key" className="text-sm text-[#a0a0b8] font-medium">Klucz API Gemini:</label>
              <input 
                type="password" 
                id="api-key" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Wklej swój klucz tutaj..." 
                className="w-full p-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:border-violet-500 focus:bg-black/40 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="model" className="text-sm text-[#a0a0b8] font-medium">Model Tłumacza:</label>
              <select 
                id="model" 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:border-violet-500 focus:bg-black/40 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all appearance-none"
              >
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Zalecany)</option>
                <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite Preview</option>
              </select>
            </div>

            <div className="border-t border-white/10 my-2"></div>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="notion-api-key" className="text-sm text-[#a0a0b8] font-medium">Klucz API Notion (Opcjonalnie):</label>
              <input 
                type="password" 
                id="notion-api-key" 
                value={notionApiKey}
                onChange={(e) => setNotionApiKey(e.target.value)}
                placeholder="secret_..." 
                className="w-full p-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:border-violet-500 focus:bg-black/40 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="notion-page-id" className="text-sm text-[#a0a0b8] font-medium">ID Strony Notion (Opcjonalnie):</label>
              <input 
                type="text" 
                id="notion-page-id" 
                value={notionPageId}
                onChange={(e) => setNotionPageId(e.target.value)}
                placeholder="np. 1234567890abcdef..." 
                className="w-full p-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:border-violet-500 focus:bg-black/40 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              />
            </div>
          </div>
        </section>

        <section 
          {...getRootProps()} 
          className={`bg-[rgba(25,26,36,0.4)] backdrop-blur-md border rounded-2xl p-10 text-center cursor-pointer transition-all relative overflow-hidden shadow-2xl ${
            isDragActive ? 'border-violet-500 bg-violet-500/5' : 'border-white/10 hover:border-violet-500 hover:bg-violet-500/5'
          }`}
        >
          <input {...getInputProps()} />
          
          {!isProcessing && !isSuccess ? (
            <div className="flex flex-col items-center gap-3">
              <div className="text-violet-500 bg-violet-500/10 p-4 rounded-full mb-2">
                {file ? <FileText size={32} /> : <UploadCloud size={32} />}
              </div>
              <h3 className="text-xl font-semibold">
                {file ? file.name : 'Przeciągnij i upuść plik PDF'}
              </h3>
              <p className="text-[#a0a0b8] text-sm">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'lub kliknij by przeglądać dysk'}
              </p>
              
              {file && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTranslate();
                  }}
                  className="mt-4 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-violet-500/20 flex items-center gap-2"
                >
                  Rozpocznij tłumaczenie
                </button>
              )}
            </div>
          ) : isProcessing || isExportingNotion ? (
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <Loader2 size={40} className="text-violet-500 animate-spin" />
              <h3 className="text-xl font-semibold">{isExportingNotion ? 'Eksportowanie...' : 'Sztuczna Inteligencja pracuje...'}</h3>
              <p className="text-[#a0a0b8] text-sm">{statusText}</p>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent animate-[scan_2s_infinite_linear] shadow-[0_0_10px_rgba(139,92,246,0.8)]"></div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <CheckCircle size={48} className="text-green-500 mb-2" />
              <h3 className="text-2xl font-semibold text-white">Tłumaczenie zakończone!</h3>
              <p className="text-[#a0a0b8] text-sm mb-4">
                Wybierz format, w jakim chcesz pobrać przetłumaczony plik.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center flex-wrap">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    generatePdf();
                  }}
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
                >
                  <FileText size={20} />
                  Pobierz PDF
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadMarkdown();
                  }}
                  className="px-6 py-3 bg-black/40 hover:bg-black/60 border border-white/10 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Pobierz plik tekstowy (.md)
                </button>

                {notionApiKey && notionPageId && !notionSuccessUrl && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      exportToNotion();
                    }}
                    className="px-6 py-3 bg-black/40 hover:bg-black/60 border border-white/10 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Zapisz do Notion
                  </button>
                )}
              </div>

              {notionSuccessUrl && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                  <p className="text-green-400 font-medium mb-2">Zapisano pomyślnie w Notion!</p>
                  <a href={notionSuccessUrl} target="_blank" rel="noreferrer" className="text-sm text-white underline hover:text-green-300" onClick={(e) => e.stopPropagation()}>
                    Otwórz stronę w Notion
                  </a>
                </div>
              )}
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setIsSuccess(false);
                  setTranslatedMarkdown('');
                  setNotionSuccessUrl('');
                }}
                className="mt-6 text-sm text-[#a0a0b8] hover:text-white underline underline-offset-4"
              >
                Przetłumacz kolejny plik
              </button>
            </div>
          )}
        </section>

        {error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl font-medium text-sm shadow-2xl flex items-center gap-2 animate-[slideUp_0.3s_ease]">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
      </main>

      {/* Off-screen div for PDF generation */}
      <div className="absolute left-[-9999px] top-[-9999px] w-[800px]">
        <div ref={markdownRef} className="p-8 bg-white text-black w-full" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12pt', lineHeight: '1.5' }}>
          <Markdown
            components={{
              h1: ({node, ...props}) => <h1 style={{ fontSize: '24pt', fontWeight: 'bold', marginBottom: '16pt', marginTop: '24pt' }} {...props} />,
              h2: ({node, ...props}) => <h2 style={{ fontSize: '18pt', fontWeight: 'bold', marginBottom: '14pt', marginTop: '20pt' }} {...props} />,
              h3: ({node, ...props}) => <h3 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '12pt', marginTop: '16pt' }} {...props} />,
              p: ({node, ...props}) => <p style={{ marginBottom: '12pt', textAlign: 'justify' }} {...props} />,
              ul: ({node, ...props}) => <ul style={{ marginBottom: '12pt', paddingLeft: '24pt' }} {...props} />,
              ol: ({node, ...props}) => <ol style={{ marginBottom: '12pt', paddingLeft: '24pt' }} {...props} />,
              li: ({node, ...props}) => <li style={{ marginBottom: '6pt' }} {...props} />,
              strong: ({node, ...props}) => <strong style={{ fontWeight: 'bold' }} {...props} />,
              em: ({node, ...props}) => <em style={{ fontStyle: 'italic' }} {...props} />,
            }}
          >
            {translatedMarkdown}
          </Markdown>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(50px, 50px) scale(1.1); }
        }
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
