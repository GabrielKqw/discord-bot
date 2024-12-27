import { Client, Message, EmbedBuilder, PermissionsBitField, TextChannel } from 'discord.js';
import { pool } from '../discord.service';

const userVoiceState = new Map<string, string | null>();

export function setupVoiceLogs(client: Client) {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.member.user.id;
    const timestamp = new Date();

    try {
      if (!oldState.channel && newState.channel) {
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
  let userId = args[0]?.replace(/[<@!>]/g, '');

  if (!message.member || !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
    return;
  }

  if (!userId) {
    userId = message.author.id;
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
  }
}

export async function handleMuteCommand(message: Message) {
  const args = message.content.split(' ').slice(1);

  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
    return;
  }

  const userId = args[0]?.replace(/[<@!>]/g, '');
  const reason = args.slice(1, -1).join(' ') || 'Sem motivo especificado';
  const time = args[args.length - 1];

  if (!userId || !time) {
    return message.reply('Uso incorreto do comando. Use: `!mute <id ou menção> <motivo> <tempo>`');
  }

  const member = message.guild.members.cache.get(userId);

  if (!member) {
    return message.reply('Usuário não encontrado.');
  }

  let duration = 0;
  const match = time.match(/(\d+)([dhm])/);
  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'd':
        if (amount > 28) {
          return message.reply('O limite máximo para mute é de 28 dias.');
        }
        duration = amount * 24 * 60 * 60 * 1000;
        break;
      case 'h':
        duration = amount * 60 * 60 * 1000;
        break;
      case 'm':
        duration = amount * 60 * 1000;
        break;
    }
  }

  if (duration <= 0) {
    return message.reply('Tempo inválido. Use o formato `Xd`, `Xh` ou `Xm`.');
  }

  try {
    await member.timeout(duration, reason); // Alterado para passar 'duration' como número

    const endTime = new Date(Date.now() + duration);

    await pool.query(
      'INSERT INTO punishments (user_id, moderator_id, type, reason, duration) VALUES ($1, $2, $3, $4, $5)',
      [userId, message.author.id, 'mute', reason, endTime.toISOString()],
    );

    const muteEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Usuário mutado')
      .setDescription(`**Usuário:** ${member.user.tag}\n**Motivo:** ${reason}\n**Duração:** ${time}`)
      .setTimestamp();

    if (message.channel instanceof TextChannel) {
      message.channel.send({ embeds: [muteEmbed] });
    }
  } catch (error) {
    console.error('Erro ao mutar o usuário:', error);
    if (error.code === 50035) {
      return message.reply('Ocorreu um erro ao mutar o usuário. Verifique se o tempo está dentro do limite permitido.');
    }
    message.reply('Ocorreu um erro ao mutar o usuário.');
  }
}
