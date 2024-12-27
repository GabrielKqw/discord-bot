import * as dotenv from 'dotenv';
dotenv.config();

import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, GatewayIntentBits, Message } from 'discord.js';
import { Pool } from 'pg';
import { setupVoiceLogs, handleVoiceLogsCommand } from './commands/voicelogs';
import { handleMuteCommand } from './commands/mute';
import { handleUnmuteCommand } from './commands/unmute'; 
import { handleUserInfoCommand } from './commands/userinfo';
import { handleBanCommand, handleUnbanCommand } from './commands/ban';
import { handleModLogsCommand } from './commands/modlogs';
import { handleWarnCommand } from './commands/warn';

if (typeof process.env.DATABASE_PASSWORD !== 'string') {
  console.error('A senha do banco de dados não é uma string válida');
} else {
  console.log('Senha válida:', process.env.DATABASE_PASSWORD);
}

const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT, 10),
});

@Injectable()
export class DiscordService implements OnModuleInit {
  private client: Client;

  async onModuleInit() {
    await this.connectToDatabase();
    this.initializeClient();
  }

  private async connectToDatabase() {
    try {
      await pool.query('SELECT NOW()');
      console.log('Conectado ao banco de dados PostgreSQL!');
    } catch (error) {
      console.error('Erro ao conectar ao banco de dados:', error);
    }
  }

  private initializeClient() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.registerEvents();
    this.client.login(process.env.DISCORD_TOKEN);
  }

  private registerEvents() {
    this.client.once('ready', () => {
      console.log(`Bot logged in as ${this.client.user.tag}`);
      setupVoiceLogs(this.client);
    });

    this.client.on('messageCreate', (message: Message) => {
      this.handleMessage(message);
    });
  }

  private handleMessage(message: Message) {
    if (message.author.bot) return;

    if (message.content.startsWith('!voicelogs')) {
      handleVoiceLogsCommand(message);
    }

    if (message.content.startsWith('!mute')) {
      handleMuteCommand(message);
    }
    if (message.content.startsWith('!userinfo')) {
      handleUserInfoCommand(message);
    }
  
    if (message.content.startsWith('!unmute')) {
      handleUnmuteCommand(message);
    }
    if (message.content.startsWith('!ban')) {
      handleBanCommand(message);
    }
  
    if (message.content.startsWith('!unban')) {
      handleUnbanCommand(message);
    }

    
  if (message.content.startsWith('!modlogs')) {
    handleModLogsCommand(message);
  }
  if (message.content.startsWith('&warn')) {
    handleWarnCommand(message); // Chama o handleWarnCommand para o comando !warn
  }
  }
}

export { pool };
