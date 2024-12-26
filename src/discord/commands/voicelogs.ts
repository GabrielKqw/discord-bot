import { Client, Message, EmbedBuilder, TextChannel } from 'discord.js';
import { pool } from '../discord.service'; 

const userVoiceState = new Map<string, string | null>();

export function setupVoiceLogs(client: Client) {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.member.user.id;
    const timestamp = new Date();

    try {
      if (!oldState.channel && newState.channel) {
        // Salva o log no banco de dados
        await pool.query(
          'INSERT INTO voice_logs (user_id, timestamp, event, channel_id) VALUES ($1, $2, $3, $4)',
          [userId, timestamp, 'entrou', newState.channel.id],
        );
        userVoiceState.set(userId, newState.channel.name);
      }

      if (oldState.channel && !newState.channel) {
        await pool.query(
          'INSERT INTO voice_logs (user_id, timestamp, event, channel_id) VALUES ($1, $2, $3, $4)',
          [userId, timestamp, 'saiu', oldState.channel.id],
        );
        userVoiceState.set(userId, null);
      }

      if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        await pool.query(
          'INSERT INTO voice_logs (user_id, timestamp, event, channel_id) VALUES ($1, $2, $3, $4)',
          [userId, timestamp, 'mudou', newState.channel.id],
        );
        userVoiceState.set(userId, newState.channel.name);
      }
    } catch (error) {
      console.error('Erro ao registrar log de voz no banco de dados:', error);
    }
  });
}

export async function handleVoiceLogsCommand(message: Message) {
  const args = message.content.split(' ').slice(1);
  const userId = args[0]?.replace(/[<@!>]/g, '');

  if (!userId) {
    return message.reply('Por favor, mencione um usuário ou forneça o ID.');
  }

  try {
    const result = await pool.query('SELECT * FROM voice_logs WHERE user_id = $1 ORDER BY timestamp DESC', [userId]);
    const logs = result.rows;

    const currentChannel = userVoiceState.get(userId);

    if (logs.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setAuthor({
          name: `Registro de voz - ${message.guild.members.cache.get(userId)?.user.tag || 'Usuário'}`,
          iconURL: message.guild.members.cache.get(userId)?.user.displayAvatarURL(),
        })
        .setDescription('Nenhum registro de voz encontrado.');

      if (message.channel instanceof TextChannel) {
        message.channel.send({ embeds: [emptyEmbed] });
      }
      return;
    }

    const pageSize = 7;
    let page = parseInt(args[1]) || 1;

    const totalPages = Math.ceil(logs.length / pageSize);
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const paginatedLogs = logs.slice((page - 1) * pageSize, page * pageSize);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setAuthor({
        name: `Registro de voz - ${message.guild.members.cache.get(userId)?.user.tag || 'Usuário'}`,
        iconURL: message.guild.members.cache.get(userId)?.user.displayAvatarURL(),
      })
      .setDescription(
        paginatedLogs.map((log) => `- ${log.timestamp.toLocaleString()}: ${log.event} ${log.channel_id ? `<#${log.channel_id}>` : ''}`).join('\n'),
      )
      .setFooter({ text: `Página ${page} de ${totalPages}` });

    if (currentChannel) {
      embed.addFields([{ name: 'Informações de voz', value: `Conectado em: ${currentChannel}` }]);
    } else {
      embed.addFields([{ name: 'Informações de voz', value: 'Desconectado' }]);
    }

    if (message.channel instanceof TextChannel) {
      message.channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Erro ao buscar logs de voz do banco de dados:', error);
    message.reply('Ocorreu um erro ao buscar os logs de voz.');
  }
}