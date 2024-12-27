import {
  Message,
  EmbedBuilder,
  PermissionsBitField,
  TextChannel,
} from 'discord.js';
import { pool } from '../discord.service';

export async function handleWarnCommand(message: Message) {
  const args = message.content.split(' ').slice(1);

  if (
    !message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)
  ) {
    return;
  }

  const userId = args[0]?.replace(/[<@!>]/g, ''); // Remove qualquer formatação de menção
  const reason = args.slice(1).join(' ') || 'Sem motivo especificado';

  if (!userId || isNaN(Number(userId))) {
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Erro')
      .setDescription(
        'Uso incorreto do comando. Use: `!warn <id do usuário> <motivo>`',
      );
    return message.reply({ embeds: [embed] });
  }

  let member;
  try {
    // Tenta buscar o membro pela API do Discord
    member = await message.guild.members.fetch(userId);
  } catch {
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Erro')
      .setDescription('Usuário não encontrado no servidor.');
    return message.reply({ embeds: [embed] });
  }

  try {
    await pool.query(
      'INSERT INTO punishments (user_id, moderator_id, type, reason) VALUES ($1, $2, $3, $4)',
      [userId, message.author.id, 'warn', reason],
    );

    const warnDM = new EmbedBuilder()
      .setColor('#ffff00')
      .setTitle('Você recebeu um aviso')
      .setDescription(
        `**Servidor:** ${message.guild.name}\n**Motivo:** ${reason}`,
      );

    try {
      await member.send({ embeds: [warnDM] });
    } catch (error) {
      console.error(
        'Não foi possível enviar mensagem na DM do usuário:',
        error,
      );

      // Notifica no canal apenas se a DM estiver fechada
      const dmFailedEmbed = new EmbedBuilder()
        .setColor('#ffcc00')
        .setTitle('Aviso')
        .setDescription(
          `Não foi possível enviar a mensagem na DM do usuário com ID \`${userId}\`. DM fechada.`,
        );
      if (message.channel instanceof TextChannel) {
        message.channel.send({ embeds: [dmFailedEmbed] });
      }
    }

    // Mensagem de confirmação no canal
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Sucesso')
      .setDescription(`Warn aplicado ao usuário com ID \`${userId}\`.`);
    if (message.channel instanceof TextChannel) {
      message.channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Erro ao aplicar warn:', error);
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Erro')
      .setDescription('Ocorreu um erro ao aplicar o warn.');
    message.reply({ embeds: [embed] });
  }
}
