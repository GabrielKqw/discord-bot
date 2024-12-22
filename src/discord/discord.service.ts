import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, GatewayIntentBits } from 'discord.js';

@Injectable()
export class DiscordService implements OnModuleInit {
  private client: Client;

  onModuleInit() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
      ],
    });

    this.client.once('ready', () => {
      console.log(`Logged in as ${this.client.user.tag}`);
    });

    this.client.on('messageCreate', this.handleMessage.bind(this));

    this.client.login(process.env.DISCORD_TOKEN);
  }

  async handleMessage(message) {
    if (message.content.startsWith('!userinfo')) {
      const mentionedUser = message.mentions.users.first() || message.author;
      const member = message.guild.members.cache.get(mentionedUser.id);

      const embed = {
        color: 0x0099ff,
        author: {
          name: `${mentionedUser.tag}`,
          icon_url: mentionedUser.displayAvatarURL(),
        },
        fields: [
          { name: 'Menção', value: `<@${mentionedUser.id}>`, inline: true },
          { name: 'Criado em', value: `<t:${Math.floor(mentionedUser.createdTimestamp / 1000)}:F>`, inline: true },
          { name: 'Entrou em', value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Desconhecido', inline: true },
          { name: 'Apelido', value: member?.nickname || 'Nenhum', inline: true },
          { name: 'Cargos', value: member?.roles.cache.map((role) => role.name).join(', ') || 'Nenhum', inline: false },
        ],
        footer: {
          text: `ID do usuário: ${mentionedUser.id}`,
        },
      };

      await message.reply({ embeds: [embed] });
    }
  }
}
