import { Cloud, Download, FileText, File, Image, Video, Music, FileArchive, FileCode, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation, useRoute } from "wouter";
import { useEffect, useState } from "react";

interface FileInfo {
  id: string;
  nome: string;
  tamanho: number;
  tipoMime: string;
  createdAt: string;
}

interface ShareInfo {
  id: string;
  fileId: string;
  linkCode: string;
  downloadCount: number;
  createdAt: string;
}

export default function SharePage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/share/:linkCode");
  const [file, setFile] = useState<FileInfo | null>(null);
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.linkCode) {
      fetchShareInfo(params.linkCode);
    }
  }, [params?.linkCode]);

  const fetchShareInfo = async (linkCode: string) => {
    try {
      const response = await fetch(`/api/shares/${linkCode}`);
      
      if (response.ok) {
        const data = await response.json();
        setFile(data.file);
        setShare(data.share);
      } else if (response.status === 404) {
        setError("Link não encontrado ou expirado");
      } else if (response.status === 410) {
        setError("Este link expirou");
      } else {
        setError("Erro ao carregar ficheiro");
      }
    } catch (err) {
      console.error("Error fetching share:", err);
      setError("Erro ao carregar ficheiro");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (params?.linkCode) {
      window.open(`/api/shares/${params.linkCode}/download`, "_blank");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="w-16 h-16 text-purple-400" />;
    if (mimeType.startsWith("video/")) return <Video className="w-16 h-16 text-blue-400" />;
    if (mimeType.startsWith("audio/")) return <Music className="w-16 h-16 text-green-400" />;
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) 
      return <FileArchive className="w-16 h-16 text-yellow-400" />;
    if (mimeType.includes("javascript") || mimeType.includes("json") || mimeType.includes("html") || mimeType.includes("css"))
      return <FileCode className="w-16 h-16 text-orange-400" />;
    return <File className="w-16 h-16 text-primary" />;
  };

  return (
    <div className="min-h-screen w-screen max-w-full overflow-x-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-foreground">
      {/* Navigation */}
      <nav className="w-full py-6 px-6 md:px-12 flex justify-between items-center">
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 font-display font-bold text-xl sm:text-2xl tracking-tighter cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-none"
          data-testid="link-home"
        >
          <Cloud className="w-6 sm:w-8 h-6 sm:h-8 text-white fill-white/20" />
          <span className="text-white drop-shadow-md">AngoCloud</span>
        </button>
      </nav>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-white/70">A carregar...</p>
            </div>
          ) : error ? (
            <div className="backdrop-blur-md bg-white/10 p-8 rounded-2xl border border-white/30 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <h1 className="text-2xl font-bold text-white mb-2">Oops!</h1>
              <p className="text-white/70 mb-6">{error}</p>
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/80 text-white font-medium transition-colors"
                data-testid="button-go-home"
              >
                Ir para o Início
              </button>
            </div>
          ) : file && share ? (
            <div className="backdrop-blur-md bg-white/10 p-8 rounded-2xl border border-white/30 text-center">
              <div className="mb-6">
                {getFileIcon(file.tipoMime)}
              </div>
              
              <h1 className="text-xl font-bold text-white mb-2 break-words">{file.nome}</h1>
              <p className="text-white/60 text-sm mb-6">{formatFileSize(file.tamanho)}</p>
              
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary hover:bg-primary/80 text-white font-bold text-lg transition-colors"
                data-testid="button-download"
              >
                <Download className="w-5 h-5" />
                Fazer Download
              </button>
              
              <p className="text-white/40 text-xs mt-6">
                Partilhado via AngoCloud • {share.downloadCount} downloads
              </p>
            </div>
          ) : null}
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 md:px-12 text-center">
        <p className="text-white/50 text-sm">
          &copy; 2024 AngoCloud. A nuvem de Angola.
        </p>
      </footer>
    </div>
  );
}
