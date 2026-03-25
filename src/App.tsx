/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  Share2, 
  History, 
  Zap, 
  Camera, 
  Maximize2,
  ChevronRight,
  Loader2,
  AlertCircle,
  User,
  Layers,
  Settings2,
  RefreshCcw,
  CreditCard,
  CheckCircle2,
  Play,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  aspectRatio: string;
  character?: string;
  size?: string;
}

interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  aspectRatio: string;
}

interface Character {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

const CHARACTERS: Character[] = [
  { id: 'aria', name: 'Aria', role: 'Fashion Model', avatar: 'https://picsum.photos/seed/aria/100/100' },
  { id: 'julian', name: 'Julian', role: 'Method Actor', avatar: 'https://picsum.photos/seed/julian/100/100' },
  { id: 'sophia', name: 'Sophia', role: 'Tech Influencer', avatar: 'https://picsum.photos/seed/sophia/100/100' },
];

const QUICK_ACTIONS = [
  { id: 'red-carpet', name: 'Red Carpet', desc: 'Full body • Elegant pose', ratio: '9:16' },
  { id: 'street-style', name: 'Street Style', desc: 'Candid • Urban walk', ratio: '4:5' },
  { id: 'studio-headshot', name: 'Studio Headshot', desc: 'Close-up • Pro lighting', ratio: '1:1' },
  { id: 'action-scene', name: 'Action Scene', desc: 'Dynamic • Cinematic blur', ratio: '16:9' },
  { id: 'magazine-cover', name: 'Magazine Cover', desc: 'High fashion • Minimalist', ratio: '3:4' },
  { id: 'casual-vibe', name: 'Casual Vibe', desc: 'Relaxed • Natural light', ratio: '1:1' },
];

const SIZES = [
  { label: '1K Standard', value: '1K' },
  { label: '2K High Res', value: '2K' },
  { label: '4K Ultra HD', value: '4K' },
];

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1' },
  { label: '2:3', value: '2:3' },
  { label: '3:2', value: '3:2' },
  { label: '3:4', value: '3:4' },
  { label: '4:3', value: '4:3' },
  { label: '9:16', value: '9:16' },
  { label: '16:9', value: '16:9' },
  { label: '21:9', value: '21:9' },
];

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [numPhotos, setNumPhotos] = useState(1);
  const [credits, setCredits] = useState(25);
  const [selectedCharacter, setSelectedCharacter] = useState<Character>(CHARACTERS[0]);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideo[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'generation' | 'video' | 'edit' | 'analyze' | 'faceswap'>('generation');

  // Video specific state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoQuality, setVideoQuality] = useState('Standard');
  const [videoDuration, setVideoDuration] = useState('5s');
  const [videoSourceImage, setVideoSourceImage] = useState<string | null>(null);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);

  // Edit specific state
  const [editPrompt, setEditPrompt] = useState('');
  const [editSourceImage, setEditSourceImage] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [wardrobe, setWardrobe] = useState('Uncensored (Original)');
  const [outputSize, setOutputSize] = useState('Original Aspect Ratio');

  // Analyze specific state
  const [analyzeResult, setAnalyzeResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Face Swap specific state
  const [swapType, setSwapType] = useState<'face' | 'head'>('face');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [sourceFace, setSourceFace] = useState<string | null>(null);
  const [targetImage, setTargetImage] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  const aiRef = useRef<GoogleGenAI | null>(null);

  const ensureApiKey = async () => {
    // @ts-ignore
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }
  };

  const getAiInstance = () => {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  };

  useEffect(() => {
    if (process.env.GEMINI_API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }, []);

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    if (credits < 1) {
      setError("Insufficient credits.");
      return;
    }

    await ensureApiKey();
    setIsGenerating(true);
    setError(null);

    try {
      const ai = getAiInstance();
      const fullPrompt = `A high-end celebrity portrait of ${selectedCharacter.name} (${selectedCharacter.role}), ${prompt}, professional photography, cinematic lighting, highly detailed features`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: imageSize as any,
          },
        },
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        const newImage: GeneratedImage = {
          id: Math.random().toString(36).substring(7),
          url: imageUrl,
          prompt: prompt,
          timestamp: Date.now(),
          aspectRatio: aspectRatio,
          character: selectedCharacter.name,
          size: imageSize,
        };
        setCurrentImage(newImage);
        setHistory(prev => [newImage, ...prev]);
        setCredits(prev => prev - 1);
      } else {
        throw new Error("Generation failed.");
      }
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
      setError(err.message || "An error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoSourceImage) {
      setError("Please select or upload an image first.");
      return;
    }
    if (credits < 8) {
      setError("Insufficient credits (8 required).");
      return;
    }

    await ensureApiKey();
    setIsVideoGenerating(true);
    setError(null);

    try {
      const ai = getAiInstance();
      const base64Data = videoSourceImage.split(',')[1];
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: videoPrompt || "Cinematic movement, high quality",
        image: {
          imageBytes: base64Data,
          mimeType: 'image/png',
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(downloadLink, {
          headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! },
        });
        const blob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(blob);

        const newVideo: GeneratedVideo = {
          id: Math.random().toString(36).substring(7),
          url: videoUrl,
          prompt: videoPrompt,
          timestamp: Date.now(),
          aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
        };
        setCurrentVideo(newVideo);
        setVideoHistory(prev => [newVideo, ...prev]);
        setCredits(prev => prev - 8);
      }
    } catch (err: any) {
      setError(err.message || "Video generation failed.");
    } finally {
      setIsVideoGenerating(false);
    }
  };

  const handleReferenceUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (referenceImages.length + files.length > 10) {
      setError("Maximum 10 reference images allowed.");
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleEditImage = async () => {
    if (!editSourceImage || !editPrompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      const ai = getAiInstance();
      const sourceBase64 = editSourceImage.split(',')[1];
      
      const parts: any[] = [
        { inlineData: { data: sourceBase64, mimeType: 'image/png' } },
        { text: `Apply the following edit to the image: ${editPrompt}. Wardrobe: ${wardrobe}. Output: ${outputSize}.` }
      ];

      // Add reference images if any
      referenceImages.forEach(img => {
        parts.push({ inlineData: { data: img.split(',')[1], mimeType: 'image/png' } });
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        const newImage: GeneratedImage = {
          id: Math.random().toString(36).substring(7),
          url: imageUrl,
          prompt: editPrompt,
          timestamp: Date.now(),
          aspectRatio: '1:1',
        };
        setCurrentImage(newImage);
        setHistory(prev => [newImage, ...prev]);
        setCredits(prev => prev - 2); // User request shows 2 credits for edit
      }
    } catch (err: any) {
      setError(err.message || "Edit failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!editSourceImage) return;
    
    setIsAnalyzing(true);
    setError(null);

    try {
      const ai = getAiInstance();
      const base64Data = editSourceImage.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/png' } },
            { text: "Analyze this image in detail. Describe the subject, lighting, composition, and style." }
          ],
        },
      });

      setAnalyzeResult(response.text || "No analysis available.");
    } catch (err: any) {
      setError(err.message || "Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, target: 'video' | 'edit' | 'sourceFace' | 'targetImage') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'video') setVideoSourceImage(reader.result as string);
        else if (target === 'edit') setEditSourceImage(reader.result as string);
        else if (target === 'sourceFace') setSourceFace(reader.result as string);
        else if (target === 'targetImage') setTargetImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaceSwap = async () => {
    if (!sourceFace || !targetImage) {
      setError("Please select both a source face and a target image.");
      return;
    }
    
    setIsSwapping(true);
    setError(null);

    try {
      const ai = getAiInstance();
      const sourceBase64 = sourceFace.split(',')[1];
      const targetBase64 = targetImage.split(',')[1];
      
      const prompt = swapType === 'face' 
        ? "Replace the face in the target image with the face from the source image. Maintain the target image's head shape, hair, and background."
        : "Replace the entire head (face and hair) in the target image with the head from the source image. Blend it naturally with the target body and background.";

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: sourceBase64, mimeType: 'image/png' } },
            { inlineData: { data: targetBase64, mimeType: 'image/png' } },
            { text: prompt }
          ],
        },
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        const newImage: GeneratedImage = {
          id: Math.random().toString(36).substring(7),
          url: imageUrl,
          prompt: `${swapType === 'face' ? 'Face' : 'Head'} swap`,
          timestamp: Date.now(),
          aspectRatio: '1:1',
        };
        setCurrentImage(newImage);
        setHistory(prev => [newImage, ...prev]);
        setCredits(prev => prev - 1);
      }
    } catch (err: any) {
      setError(err.message || "Face swap failed.");
    } finally {
      setIsSwapping(false);
    }
  };

  const applyQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    setAspectRatio(action.ratio);
    setPrompt(action.desc);
  };

  const resetSettings = () => {
    setPrompt('');
    setAspectRatio('1:1');
    setNumPhotos(1);
    setSelectedCharacter(CHARACTERS[0]);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="w-full md:w-72 border-r border-white/5 bg-black/40 backdrop-blur-2xl p-6 flex flex-col gap-8 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/10">
            <Sparkles className="w-6 h-6 text-black" />
          </div>
          <span className="text-xl font-bold tracking-tight">CelebMaker</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40">Credits</span>
            <span className="font-mono font-bold">{credits}/5 Free</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-white" 
              initial={{ width: 0 }}
              animate={{ width: `${(credits / 5) * 100}%` }}
            />
          </div>
          <button className="w-full py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-white/90 transition-all flex items-center justify-center gap-2">
            <Zap className="w-3 h-3 fill-current" /> Upgrade
          </button>
        </div>

        <nav className="space-y-1">
          {[
            { id: 'generation', label: 'Generation', icon: Layers },
            { id: 'video', label: 'Create a Video', icon: Play },
            { id: 'faceswap', label: 'Face Swap', icon: User },
            { id: 'edit', label: 'Edit & Filter', icon: Settings2 },
            { id: 'analyze', label: 'Analyze', icon: Camera },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.id 
                  ? "bg-white/10 text-white" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 px-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Premium User</p>
              <p className="text-xs text-white/40">Pro Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-12">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">Select a Character</h1>
              <p className="text-white/40">Choose who to generate images for</p>
            </div>
            <div className="flex gap-3">
              {CHARACTERS.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharacter(char)}
                  className={cn(
                    "group relative w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all",
                    selectedCharacter.id === char.id ? "border-white scale-110" : "border-transparent opacity-40 hover:opacity-100"
                  )}
                >
                  <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                </button>
              ))}
            </div>
          </header>

          {activeTab === 'generation' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Controls */}
              <div className="lg:col-span-5 space-y-8">
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40">Describe what you want</label>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Example: 'sunny window light, soft smile, casual white top'"
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none"
                  />
                </section>

                <div className="grid grid-cols-2 gap-8">
                  <section className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40">Photos</label>
                    <div className="flex gap-2">
                      {[1, 2, 4].map((n) => (
                        <button
                          key={n}
                          onClick={() => setNumPhotos(n)}
                          className={cn(
                            "flex-1 py-2 rounded-xl border text-sm font-bold transition-all",
                            numPhotos === n ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40">Size</label>
                    <select 
                      value={imageSize}
                      onChange={(e) => setImageSize(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      {SIZES.map(s => <option key={s.value} value={s.value} className="bg-[#111]">{s.label}</option>)}
                    </select>
                  </section>
                </div>

                <section className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">Aspect Ratio</label>
                  <div className="grid grid-cols-4 gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.value}
                        onClick={() => setAspectRatio(ratio.value)}
                        className={cn(
                          "py-2 rounded-lg border text-[10px] font-bold transition-all",
                          aspectRatio === ratio.value ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                        )}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="space-y-3">
                  <button
                    onClick={handleGenerateImage}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full py-4 bg-white text-black rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-white/5"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        Generate {numPhotos > 1 ? `${numPhotos} Photos` : 'Photo'}
                      </>
                    )}
                  </button>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </div>

              {/* Preview Area */}
              <div className="lg:col-span-7">
                <div className="relative aspect-[3/4] w-full bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden flex items-center justify-center group">
                  <AnimatePresence mode="wait">
                    {currentImage ? (
                      <motion.div
                        key={currentImage.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full h-full"
                      >
                        <img
                          src={currentImage.url}
                          alt={currentImage.prompt}
                          className="w-full h-full object-contain"
                        />
                      </motion.div>
                    ) : (
                      <div className="text-center space-y-6 max-w-xs">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                          <ImageIcon className="w-10 h-10 text-white/10" />
                        </div>
                        <h3 className="text-2xl font-bold">Ready for Action</h3>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-5 space-y-8">
                <section className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">1. Select Image</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileUpload(e, 'video')}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="p-6 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center gap-2 hover:border-white/20 transition-all">
                        <Camera className="w-6 h-6 text-white/40" />
                        <span className="text-xs font-bold">Upload</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => history.length > 0 && setVideoSourceImage(history[0].url)}
                      className="p-6 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center gap-2 hover:border-white/20 transition-all"
                    >
                      <ImageIcon className="w-6 h-6 text-white/40" />
                      <span className="text-xs font-bold">From Library</span>
                    </button>
                  </div>
                  {videoSourceImage && (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
                      <img src={videoSourceImage} className="w-full h-full object-cover" />
                      <button onClick={() => setVideoSourceImage(null)} className="absolute top-2 right-2 p-1 bg-black/40 rounded-full"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">2. Describe Video</label>
                  <textarea
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="e.g., A woman in a bikini walking on the beach, hair blowing in the wind..."
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm"
                  />
                </section>

                <section className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">3. Settings</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] text-white/40 uppercase">Quality</span>
                      <select value={videoQuality} onChange={(e) => setVideoQuality(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                        <option value="Standard">Standard (8)</option>
                        <option value="Pro">Pro (9)</option>
                        <option value="Master">Master (40)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] text-white/40 uppercase">Duration</span>
                      <select value={videoDuration} onChange={(e) => setVideoDuration(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                        <option value="5s">5 Seconds</option>
                        <option value="10s">10 Seconds (+8)</option>
                      </select>
                    </div>
                  </div>
                </section>

                <button
                  onClick={handleGenerateVideo}
                  disabled={isVideoGenerating || !videoSourceImage}
                  className="w-full py-4 bg-white text-black rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50"
                >
                  {isVideoGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                  Generate Video • 8
                </button>
              </div>

              <div className="lg:col-span-7">
                <div className="relative aspect-video w-full bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden flex items-center justify-center">
                  {currentVideo ? (
                    <video src={currentVideo.url} controls className="w-full h-full" />
                  ) : (
                    <div className="text-center space-y-4">
                      <Play className="w-12 h-12 text-white/10 mx-auto" />
                      <p className="text-sm text-white/30">Select an image to start animating</p>
                    </div>
                  )}
                  {isVideoGenerating && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-20">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-white" />
                        <span className="text-xs font-bold tracking-widest uppercase">Rendering Video...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faceswap' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-5 space-y-8">
                {/* Swap Type Selection */}
                <div className="flex gap-4 p-1 bg-white/5 rounded-2xl border border-white/10">
                  <button
                    onClick={() => setSwapType('face')}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-1",
                      swapType === 'face' ? "bg-white text-black" : "text-white/40 hover:text-white"
                    )}
                  >
                    <span>Face Swap</span>
                    <span className="text-[10px] opacity-60 font-medium">Replace face only</span>
                  </button>
                  <button
                    onClick={() => setSwapType('head')}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-1",
                      swapType === 'head' ? "bg-white text-black" : "text-white/40 hover:text-white"
                    )}
                  >
                    <span>Head Swap</span>
                    <span className="text-[10px] opacity-60 font-medium">Replace full head</span>
                  </button>
                </div>

                {/* Media Type */}
                <section className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">Media:</label>
                  <div className="flex gap-4">
                    {['image', 'video'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setMediaType(type as any)}
                        className={cn(
                          "px-6 py-2 rounded-full border text-xs font-bold capitalize transition-all",
                          mediaType === type ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/40"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Source Face */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40">Source Face</label>
                    <div className="flex gap-2">
                      <button onClick={() => history.length > 0 && setSourceFace(history[0].url)} className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest">Library</button>
                      <span className="text-white/10">|</span>
                      <div className="relative">
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'sourceFace')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <button className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest">Upload</button>
                      </div>
                    </div>
                  </div>
                  <div className="relative aspect-square rounded-3xl overflow-hidden border-2 border-dashed border-white/10 flex items-center justify-center group">
                    {sourceFace ? (
                      <>
                        <img src={sourceFace} className="w-full h-full object-cover" />
                        <button onClick={() => setSourceFace(null)} className="absolute top-4 right-4 p-2 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <div className="text-center space-y-2 p-6">
                        <User className="w-10 h-10 text-white/10 mx-auto" />
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Upload a clear face photo</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Target Body / Scene */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40">Target Body / Scene</label>
                    <div className="flex gap-2">
                      <button onClick={() => history.length > 0 && setTargetImage(history[0].url)} className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest">Library</button>
                      <span className="text-white/10">|</span>
                      <div className="relative">
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'targetImage')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <button className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest">Upload</button>
                      </div>
                    </div>
                  </div>
                  <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-dashed border-white/10 flex items-center justify-center group">
                    {targetImage ? (
                      <>
                        <img src={targetImage} className="w-full h-full object-cover" />
                        <button onClick={() => setTargetImage(null)} className="absolute top-4 right-4 p-2 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <div className="text-center space-y-2 p-6">
                        <ImageIcon className="w-10 h-10 text-white/10 mx-auto" />
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Choose the image to swap onto</p>
                      </div>
                    )}
                  </div>
                </section>

                <button
                  onClick={handleFaceSwap}
                  disabled={isSwapping || !sourceFace || !targetImage}
                  className="w-full py-4 bg-white text-black rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50 transition-all"
                >
                  {isSwapping ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
                  Swap Face • 1
                </button>

                {/* Tips */}
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Tips for best results</h4>
                  <ul className="space-y-2">
                    {[
                      "Use a clear, front-facing face photo with good lighting",
                      "Target image should have a visible face area to swap onto",
                      "Higher resolution images produce better results",
                      "Similar face angles between source and target work best"
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-[11px] text-white/40">
                        <div className="w-1 h-1 rounded-full bg-white/20 mt-1.5 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="relative aspect-[3/4] w-full bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden flex items-center justify-center">
                  {currentImage ? (
                    <img src={currentImage.url} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center space-y-4">
                      <User className="w-12 h-12 text-white/10 mx-auto" />
                      <p className="text-sm text-white/20">Face swap result will appear here</p>
                    </div>
                  )}
                  {isSwapping && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-20">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-white" />
                        <span className="text-xs font-bold tracking-widest uppercase">Swapping Face...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/20">
                  <span>Guides:</span>
                  <a href="#" className="hover:text-white transition-colors">AI Face Swap</a>
                  <span>·</span>
                  <a href="#" className="hover:text-white transition-colors">Face Swap Video</a>
                  <span>·</span>
                  <a href="#" className="hover:text-white transition-colors">Head Swap</a>
                  <span>·</span>
                  <a href="#" className="hover:text-white transition-colors">NSFW Face Swap</a>
                  <span>·</span>
                  <a href="#" className="hover:text-white transition-colors">Deepfake Generator</a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-5 space-y-8">
                {/* Reference Images */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40">Reference Images</label>
                    <span className="text-[10px] text-white/20">{referenceImages.length}/10</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="relative aspect-square">
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleReferenceUpload} 
                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                      />
                      <div className="w-full h-full rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1 hover:border-white/20 transition-all">
                        <Camera className="w-5 h-5 text-white/40" />
                        <span className="text-[10px] font-bold">Upload</span>
                      </div>
                    </div>
                    {referenceImages.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                        <img src={img} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setReferenceImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Controls */}
                <section className="space-y-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Controls</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <Layers className="w-5 h-5 text-white/40" />
                        <div>
                          <p className="text-xs font-bold">Wardrobe</p>
                          <p className="text-[10px] text-white/40">{wardrobe}</p>
                        </div>
                      </div>
                      <button className="text-[10px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">Change</button>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Quick Presets</label>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          'change background to beach sunset',
                          'make them wear a red dress',
                          'add sunglasses',
                          'make it nighttime'
                        ].map(preset => (
                          <button 
                            key={preset}
                            onClick={() => setEditPrompt(preset)}
                            className="text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/60 hover:text-white hover:bg-white/10 transition-all"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Output Size</label>
                      <select 
                        value={outputSize}
                        onChange={(e) => setOutputSize(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none"
                      >
                        <option value="Original Aspect Ratio">Original Aspect Ratio (Highest Quality)</option>
                        <option value="1:1">Square (1:1)</option>
                        <option value="9:16">Portrait (9:16)</option>
                      </select>
                    </div>
                  </div>
                </section>

                <button
                  onClick={handleEditImage}
                  disabled={isGenerating || !editSourceImage || !editPrompt.trim()}
                  className="w-full py-4 bg-white text-black rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50 transition-all"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings2 className="w-5 h-5" />}
                  Edit Image • 2
                </button>
              </div>

              <div className="lg:col-span-7">
                <div className="flex flex-col h-full gap-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Image Editor</h3>
                    <button className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-all flex items-center gap-2">
                      <Download className="w-4 h-4" /> Save
                    </button>
                  </div>
                  
                  <div className="flex-1 relative aspect-square w-full bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden flex items-center justify-center group">
                    {currentImage ? (
                      <img src={currentImage.url} className="w-full h-full object-contain" />
                    ) : editSourceImage ? (
                      <img src={editSourceImage} className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center space-y-4">
                        <ImageIcon className="w-12 h-12 text-white/10 mx-auto" />
                        <p className="text-sm text-white/20">Select an image to begin editing</p>
                      </div>
                    )}
                    
                    {isGenerating && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                        <Loader2 className="w-10 h-10 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Image dimensions</p>
                      <p className="text-sm font-mono">{currentImage ? '1024 × 1024' : '--'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => history.length > 0 && setEditSourceImage(history[0].url)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                        Photo Library
                      </button>
                      <div className="relative">
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'edit')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                          Upload
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analyze' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-5 space-y-8">
                <section className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">Select Image to Analyze</label>
                  <div className="relative aspect-square rounded-3xl overflow-hidden border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-white/20 transition-all">
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'edit')} className="absolute inset-0 opacity-0" />
                    {editSourceImage ? <img src={editSourceImage} className="w-full h-full object-cover" /> : <Camera className="w-12 h-12 text-white/10" />}
                  </div>
                </section>
                <button
                  onClick={handleAnalyzeImage}
                  disabled={isAnalyzing || !editSourceImage}
                  className="w-full py-4 bg-white text-black rounded-2xl font-black flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Analyze with Gemini Pro
                </button>
              </div>
              <div className="lg:col-span-7">
                <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/5 min-h-[400px]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" /> Analysis Result
                  </h3>
                  {analyzeResult ? (
                    <div className="text-white/80 leading-relaxed whitespace-pre-wrap text-sm">
                      {analyzeResult}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-white/20 gap-4">
                      <Layers className="w-12 h-12" />
                      <p>Run analysis to see detailed insights</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* History Section */}
          {history.length > 0 && (
            <section className="space-y-8 pt-12 border-t border-white/5">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <History className="w-6 h-6 text-white/40" />
                  Recent Creations
                </h2>
                <button className="text-sm text-white/40 hover:text-white transition-colors">View All</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {history.map((img) => (
                  <motion.div
                    key={img.id}
                    layoutId={img.id}
                    onClick={() => setCurrentImage(img)}
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer group"
                  >
                    <img src={img.url} alt={img.prompt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                      <p className="text-[10px] text-white/60 font-medium mb-1">{img.character}</p>
                      <p className="text-xs text-white font-bold line-clamp-1">{img.prompt}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
