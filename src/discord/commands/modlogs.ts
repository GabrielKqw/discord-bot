import { Message, EmbedBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { pool } from '../discord.service';

export async function handleModLogsCommand(message: Message) {
  const args = message.content.split(' ').slice(1);
  const userId = args[0]?.replace(/[<@!>]/g, '');

  if (!userId) {
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Erro')
      .setDescription('Uso incorreto do comando. Use: `!modlogs <id ou menção> [página]`');
    return message.reply({ embeds: [embed] });
  }

  try {
    const result = await pool.query('SELECT * FROM punishments WHERE user_id = $1 ORDER BY timestamp DESC', [userId]);
    const punishments = result.rows;

    if (punishments.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Registro de moderação - ${message.guild.members.cache.get(userId)?.user.tag || 'Usuário'}`)
        .setDescription('Nenhuma infração encontrada.');
      return message.reply({ embeds: [emptyEmbed] });
    }

    const pageSize = 5;
    let page = parseInt(args[1]) || 1;
    const totalPages = Math.ceil(punishments.length / pageSize);

    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const generateEmbed = (page: number) => {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedPunishments = punishments.slice(startIndex, endIndex);

      return new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Registro de moderação - ${message.guild.members.cache.get(userId)?.user.tag || 'Usuário'}`)
        .setDescription(paginatedPunishments.map((punishment, index) => {
          const duration = punishment.duration ? `Duração: ${punishment.duration}` : '';
          return `${startIndex + index + 1}. Tipo: ${punishment.type}\nModerador: <@${punishment.moderator_id}>\nMotivo: ${punishment.reason}\n${duration}\nData: ${punishment.timestamp.toLocaleString()}`;
        }).join('\n\n'))
        .setFooter({ text: `Página ${page} de ${totalPages}` });
    };

    const embed = generateEmbed(page);

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

    const reply = await message.reply({ embeds: [embed], components: [row] });

    const collector = reply.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: 'Você não pode usar estes botões.', ephemeral: true });
      }

      if (interaction.customId === 'prev') {
        page--;
      } else if (interaction.customId === 'next') {
        page++;
      }

      const newEmbed = generateEmbed(page);
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
      const finalEmbed = generateEmbed(page).setFooter({ text: 'Os botões expiraram.' });
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
  } catch (error) {
    console.error('Erro ao buscar logs de moderação do banco de dados:', error);
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Erro')
      .setDescription('Ocorreu um erro ao buscar os logs de moderação.');
    message.reply({ embeds: [embed] });
  }
}