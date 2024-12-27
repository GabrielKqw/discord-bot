import {
  Client,
  Message,
  EmbedBuilder,
  TextChannel,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { pool } from '../discord.service';

export const userVoiceState = new Map<string, string | null>();

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
    paginatedLogs
      .map((log) => {
        const icon =
          log.event === 'entrou'
            ? '<:entrou:1086070423856357487>'
            : log.event === 'saiu'
            ? '<:saiu:1086070427736092712>'
            : '<:mudou:1086070425244663828>';
        const channelMention = log.channel_id ? `<#${log.channel_id}>` : '';
        return `**${icon} ${log.event === 'mudou' ? `Trocou para` : log.event === 'saiu' ? `Saiu de` : `Entrou em`}** ${channelMention} — *${new Date(
          log.timestamp,
        ).toLocaleString()}*`;
      })
      .join('\n'),
  )
  .addFields([
    { name: 'Informações de voz', value: currentChannel ? `Conectado em: ${currentChannel}` : 'Desconectado' },
  ])
  .setFooter({ text: `Página ${page}/${totalPages} | Total de atividades: ${logs.length}` })
  .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('Anterior')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Próxima')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages),
      );

    if (message.channel instanceof TextChannel) {
      const reply = await message.channel.send({ embeds: [embed], components: [row] });

      const collector = reply.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({ content: 'Você não pode usar esses botões.', ephemeral: true });
        }

        if (interaction.customId === 'prev') {
          page--;
        } else if (interaction.customId === 'next') {
          page++;
        }

        const newEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setAuthor({
            name: `Registro de voz - ${message.guild.members.cache.get(userId)?.user.tag || 'Usuário'}`,
            iconURL: message.guild.members.cache.get(userId)?.user.displayAvatarURL(),
          })
          .setDescription(
            logs
              .slice((page - 1) * pageSize, page * pageSize)
              .map((log) => {
                const icon =
                log.event === 'entrou'
            ? '<:entrou:1086070423856357487>'
            : log.event === 'saiu'
            ? '<:saiu:1086070427736092712>'
            : '<:mudou:1086070425244663828>';
        const channelMention = log.channel_id ? `<#${log.channel_id}>` : '';
        return `**${icon} ${log.event === 'mudou' ? `Trocou para` : log.event === 'saiu' ? `Saiu de` : `Entrou em`}** ${channelMention} — *${new Date(
          log.timestamp,
        ).toLocaleString()}*`;
      })
              .join('\n'),
          )
          .setFooter({ text: `Página ${page}/${totalPages} | Total de atividades: ${logs.length}` })
          .setTimestamp();

        const newRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('Anterior')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page === 1),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Próxima')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page === totalPages),
          );

        await interaction.update({ embeds: [newEmbed], components: [newRow] });
      });

      collector.on('end', async () => {
        const finalEmbed = embed.setFooter({ text: 'Os botões expiraram.' });
        const disabledRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('Anterior')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Próxima')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
          );

        await reply.edit({ embeds: [finalEmbed], components: [disabledRow] });
      });
    }
  } catch (error) {
    console.error('Erro ao buscar logs de voz do banco de dados:', error);
  }
}
