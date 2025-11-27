import { Cloud, Heart, LogOut, Settings, Upload, FileText, Share2, Folder } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

interface FileItem {
  id: string;
  nome: string;
  tamanho: number;
  tipoMime: string;
  createdAt: string;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchFiles();
  }, [user, navigate]);

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/files", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias`;
    
    return date.toLocaleDateString("pt-PT");
  };

  if (!user) {
    return null;
  }

  const storageUsedGB = user.storageUsed / (1024 * 1024 * 1024);
  const storageTotalGB = user.storageLimit / (1024 * 1024 * 1024);
  const storagePercent = (user.storageUsed / user.storageLimit) * 100;

  return (
    <div className="min-h-screen w-screen max-w-full overflow-x-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-foreground selection:bg-primary/10">
      {/* Navigation */}
      <nav className="w-full py-6 px-6 md:px-12 flex justify-between items-center z-50 fixed top-0 left-0 backdrop-blur-md bg-black/20 border-b border-white/10">
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 font-display font-bold text-xl sm:text-2xl tracking-tighter cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-none"
        >
          <Cloud className="w-6 sm:w-8 h-6 sm:h-8 text-white fill-white/20" />
          <span className="text-white drop-shadow-md">AngoCloud</span>
        </button>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-white rounded-full px-6 font-bold border border-white/30 bg-white/5 hover:bg-white/15 hover:border-white/50 backdrop-blur-sm transition-all"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </nav>

      {/* Main Content */}
      <div className="pt-24 px-6 md:px-12 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="max-w-7xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">
              Bem-vindo, {user.nome}! 👋
            </h1>
            <p className="text-white/70 text-lg">Aqui está o seu armazenamento em nuvem</p>
          </div>

          {/* Storage Section */}
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 mb-12">
            {/* Storage Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="backdrop-blur-md bg-white/10 p-8 rounded-2xl border border-white/30"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Espaço de Armazenamento</h2>
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-white/80">{storageUsedGB.toFixed(2)} GB de {storageTotalGB.toFixed(0)} GB</span>
                  <span className="text-white/60 text-sm">{storagePercent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 border border-white/20">
                  <motion.div
                    className="bg-gradient-to-r from-primary to-accent h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${storagePercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
              <p className="text-white/60 text-sm mt-4">{(storageTotalGB - storageUsedGB).toFixed(2)} GB disponível</p>
              <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/70">Plano: <span className="font-bold text-white capitalize">{user.plano}</span></p>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              className="backdrop-blur-md bg-white/10 p-8 rounded-2xl border border-white/30"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Ações Rápidas</h2>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  className="flex items-center justify-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white font-medium"
                  data-testid="button-upload"
                >
                  <Upload className="w-5 h-5" />
                  Upload
                </button>
                <button 
                  className="flex items-center justify-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white font-medium"
                  data-testid="button-share"
                >
                  <Share2 className="w-5 h-5" />
                  Partilhar
                </button>
                <button 
                  className="flex items-center justify-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white font-medium"
                  data-testid="button-create-folder"
                >
                  <Folder className="w-5 h-5" />
                  Criar Pasta
                </button>
                <button 
                  className="flex items-center justify-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white font-medium"
                  data-testid="button-settings"
                >
                  <Settings className="w-5 h-5" />
                  Definições
                </button>
              </div>
            </motion.div>
          </div>

          {/* Recent Files */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            className="max-w-7xl mx-auto backdrop-blur-md bg-white/10 p-8 rounded-2xl border border-white/30"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Ficheiros Recentes</h2>
            
            {loading ? (
              <div className="text-center text-white/70 py-8">
                Carregando...
              </div>
            ) : files.length === 0 ? (
              <div className="text-center text-white/70 py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum arquivo ainda. Faça upload do seu primeiro arquivo!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.slice(0, 10).map((file, i) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer group"
                    data-testid={`file-item-${file.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="text-white font-medium">{file.nome}</p>
                        <p className="text-white/60 text-sm">{formatFileSize(file.tamanho)} • {formatDate(file.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative py-8 px-6 md:px-12 border-t border-primary/10 bg-black/20 backdrop-blur-sm mt-12"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 text-center md:text-left">
          <div className="flex items-center gap-2 font-display font-bold text-xl text-white">
            <Cloud className="w-6 h-6 text-white" />
            <span>AngoCloud</span>
          </div>
          <div className="text-sm text-white/70 flex items-center gap-2">
            <span>&copy; 2024 AngoCloud. Feito em Luanda com</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="inline-block"
            >
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            </motion.div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
