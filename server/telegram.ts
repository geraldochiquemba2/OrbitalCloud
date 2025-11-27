/**
 * Telegram Bot Service para AngoCloud
 * 
 * Este serviço gerencia o upload e download de arquivos usando a Telegram Bot API
 * como backend de armazenamento. Suporta múltiplos bots para distribuir a carga.
 */

interface TelegramBot {
  id: string;
  token: string;
  name: string;
  active: boolean;
}

interface UploadResult {
  fileId: string;
  botId: string;
}

class TelegramService {
  private bots: TelegramBot[] = [];
  private currentBotIndex: number = 0;

  constructor() {
    this.loadBotsFromEnv();
  }

  /**
   * Carrega bots configurados nas variáveis de ambiente
   * Formato esperado: TELEGRAM_BOT_1_TOKEN, TELEGRAM_BOT_2_TOKEN, etc.
   */
  private loadBotsFromEnv() {
    // Procura por tokens de bots nas variáveis de ambiente
    const envBots: TelegramBot[] = [];
    
    for (let i = 1; i <= 10; i++) {
      const token = process.env[`TELEGRAM_BOT_${i}_TOKEN`];
      if (token) {
        envBots.push({
          id: `bot_${i}`,
          token,
          name: `AngoCloud Bot ${i}`,
          active: true,
        });
      }
    }

    this.bots = envBots;
    
    if (this.bots.length === 0) {
      console.warn("⚠️  Nenhum bot Telegram configurado. Upload de arquivos não funcionará.");
      console.warn("   Configure TELEGRAM_BOT_1_TOKEN, TELEGRAM_BOT_2_TOKEN, etc.");
    } else {
      console.log(`✅ ${this.bots.length} bot(s) Telegram carregados`);
    }
  }

  /**
   * Seleciona o próximo bot disponível (round-robin)
   */
  private getNextBot(): TelegramBot | null {
    if (this.bots.length === 0) {
      return null;
    }

    const activeBots = this.bots.filter(b => b.active);
    if (activeBots.length === 0) {
      return null;
    }

    const bot = activeBots[this.currentBotIndex % activeBots.length];
    this.currentBotIndex++;
    return bot;
  }

  /**
   * Verifica se o serviço está disponível
   */
  public isAvailable(): boolean {
    return this.bots.length > 0 && this.bots.some(b => b.active);
  }

  /**
   * Faz upload de um arquivo para o Telegram
   * @param fileBuffer - Buffer do arquivo
   * @param fileName - Nome do arquivo
   * @returns Resultado do upload com file_id do Telegram
   */
  public async uploadFile(fileBuffer: Buffer, fileName: string): Promise<UploadResult> {
    const bot = this.getNextBot();
    
    if (!bot) {
      throw new Error("Nenhum bot Telegram disponível para upload");
    }

    try {
      // Determina o chat_id (pode ser um grupo/canal privado para armazenamento)
      const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID || bot.id;

      // Envia o arquivo usando a Telegram Bot API
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: "application/octet-stream" });
      formData.append("document", blob, fileName);
      formData.append("chat_id", chatId);

      const response = await fetch(
        `https://api.telegram.org/bot${bot.token}/sendDocument`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description || "Unknown error"}`);
      }

      const fileId = data.result.document.file_id;

      return {
        fileId,
        botId: bot.id,
      };
    } catch (error) {
      console.error(`Erro ao fazer upload via ${bot.name}:`, error);
      
      // Marca o bot como inativo temporariamente
      bot.active = false;
      setTimeout(() => {
        bot.active = true;
      }, 60000); // Reativa após 1 minuto

      // Tenta com outro bot
      if (this.bots.filter(b => b.active).length > 0) {
        return this.uploadFile(fileBuffer, fileName);
      }

      throw new Error("Falha ao fazer upload: todos os bots estão indisponíveis");
    }
  }

  /**
   * Obtém a URL de download de um arquivo do Telegram
   * @param fileId - ID do arquivo no Telegram
   * @param botId - ID do bot que fez o upload
   * @returns URL de download
   */
  public async getDownloadUrl(fileId: string, botId: string): Promise<string> {
    const bot = this.bots.find(b => b.id === botId);
    
    if (!bot) {
      throw new Error(`Bot ${botId} não encontrado`);
    }

    try {
      // Primeiro, obtém o caminho do arquivo
      const response = await fetch(
        `https://api.telegram.org/bot${bot.token}/getFile?file_id=${fileId}`
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description || "Unknown error"}`);
      }

      const filePath = data.result.file_path;
      
      // Retorna a URL de download
      return `https://api.telegram.org/file/bot${bot.token}/${filePath}`;
    } catch (error) {
      console.error(`Erro ao obter URL de download:`, error);
      throw new Error("Falha ao obter link de download");
    }
  }

  /**
   * Faz download de um arquivo do Telegram
   * @param fileId - ID do arquivo no Telegram
   * @param botId - ID do bot que fez o upload
   * @returns Buffer do arquivo
   */
  public async downloadFile(fileId: string, botId: string): Promise<Buffer> {
    try {
      const url = await this.getDownloadUrl(fileId, botId);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error(`Erro ao fazer download:`, error);
      throw new Error("Falha ao fazer download do arquivo");
    }
  }

  /**
   * Deleta um arquivo do Telegram (se possível)
   * Nota: A API do Telegram não permite deletar arquivos, então esta função
   * apenas registra a ação para futura implementação
   */
  public async deleteFile(fileId: string, botId: string): Promise<void> {
    // A API do Telegram não suporta deletar arquivos enviados
    // Esta função existe para compatibilidade futura
    console.log(`Arquivo ${fileId} marcado para deleção (Telegram não suporta deleção real)`);
  }
}

// Exporta instância singleton
export const telegramService = new TelegramService();
