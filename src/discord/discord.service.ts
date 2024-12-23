import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, GatewayIntentBits } from 'discord.js';
import { setupVoiceLogs, handleVoiceLogsCommand } from './commands/voicelogs';

@Injectable()
export class DiscordService implements OnModuleInit {
  private client: Client;

  onModuleInit() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
      ],
    });

    this.client.once('ready', () => {
      console.log(`Bot logged in as ${this.client.user.tag}`);
      setupVoiceLogs(this.client);
    });

    this.client.on('messageCreate', (message) => {
      if (message.author.bot) return;

      if (message.content.startsWith('!voicelogs')) {
        handleVoiceLogsCommand(message);
      }
    });

    this.client.login(process.env.DISCORD_TOKEN);
  }
}
