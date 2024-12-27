import {
    Message,
    EmbedBuilder,
    PermissionsBitField,
    TextChannel,
    AttachmentBuilder,
  } from 'discord.js';
  import { pool } from '../discord.service';
  
  export async function handleBanCommand(message: Message) {
    const args = message.content.split(' ').slice(1);
  
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return;
    }
  
    const userId = args[0]?.replace(/[<@!>]/g, '');
    let reason = args.slice(1).join(' ') || 'Sem motivo especificado';
    const attachment = message.attachments.first();
  
    if (!userId) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Erro')
        .setDescription(
          'Uso incorreto do comando. Use: `!ban <id ou menção> <motivo> [prova]`',
        );
      return message.reply({ embeds: [embed] });
    }
  
    try {
      const member = await message.guild.members.fetch(userId);
  
      const banDM = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Você foi banido')
      .setDescription(`**Motivo:** ${reason}`);
    
    if (attachment) {
      banDM.setImage(attachment.url);
      reason += `\n**Prova:** ${attachment.url}`;
    }
    
      const unbanForm = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Formulário de unban')
        .setDescription(
          'Para toda situação dentro do Servidor, há um meio de pedir recursos. De maneira direta, neste questionário você pode recorrer das punições envolvendo banimentos dentro do servidor. Resumidamente, você acha que seu ban possa ser justamente revogado? Envie seu pedido no formulário e uma equipe treinada e específica para a função analisará seu caso e informará o resultado do seu pedido https://forms.gle/TcGeKnHU6FMfYcbu9',
        );
  
      try {
        await member.send({ embeds: [banDM, unbanForm] });
      } catch (error) {
        console.error(
          'Não foi possível enviar mensagem na DM do usuário:',
          error,
        );
        const embed = new EmbedBuilder()
          .setColor('#ffa500')
          .setTitle('Aviso')
          .setDescription(
            'Não foi possível enviar DM para o usuário, mas o banimento foi aplicado.',
          );
        if (message.channel instanceof TextChannel) {
          message.channel.send({ embeds: [embed] });
        }
      }
  
      await message.guild.members.ban(userId, { reason });
  
      await pool.query(
        'INSERT INTO punishments (user_id, moderator_id, type, reason) VALUES ($1, $2, $3, $4)',
        [userId, message.author.id, 'ban', reason],
      );
  
      const shameChannelId = '1322039732452065320';
      const shameChannel = message.guild.channels.cache.get(
        shameChannelId,
      ) as TextChannel;
      if (shameChannel) {
        const shameEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('**MARTELO DA JUSTIÇA** <:banido:1322054047662080000>')
          .setDescription(
            `${member.user.tag} foi banido! Sinta o peso do martelo!`,
          );
  
        shameChannel.send({ embeds: [shameEmbed] });
      }
  
      const banLogChannelId = '1322039747069087854';
      const banLogChannel = message.guild.channels.cache.get(
        banLogChannelId,
      ) as TextChannel;
      if (banLogChannel) {
        const banLogEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('Usuário banido')
          .setDescription(
            `**Usuário:** <@${userId}>\n**Moderador:** <@${message.author.id}>\n**Motivo:** ${reason}\n ${message.guild.name}\nID do usuário banido: ${userId}`,
          )
          .setTimestamp();
        if (attachment) {
          const attachmentToSend = new AttachmentBuilder(attachment.url);
          banLogChannel.send({
            embeds: [banLogEmbed],
            files: [attachmentToSend],
          });
        } else {
          banLogChannel.send({ embeds: [banLogEmbed] });
        }
      }
  
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Sucesso')
        .setDescription(`Usuário <@${userId}> banido com sucesso.`);
      if (message.channel instanceof TextChannel) {
        message.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Erro ao banir o usuário:', error);
      if (error.code === 10013) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('Erro')
          .setDescription('Usuário não encontrado. Verifique o ID ou a menção.');
        return message.reply({ embeds: [embed] });
      }
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Erro')
        .setDescription('Ocorreu um erro ao banir o usuário.');
      message.reply({ embeds: [embed] });
    }
  }
  
  export async function handleUnbanCommand(message: Message) {
    const args = message.content.split(' ').slice(1);
  
    const allowedRoleId = '1322055014352556033';
  
    if (
      !message.member.roles.cache.has(allowedRoleId) &&
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return;
    }
  
    const userId = args[0];
    const reason = args.slice(1).join(' ') || 'Sem motivo especificado';
  
    if (!userId) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Erro')
        .setDescription('Uso incorreto do comando. Use: `!unban <id> <motivo>`');
      return message.reply({ embeds: [embed] });
    }
  
    try {
      await message.guild.members.unban(userId, reason);
  
      await pool.query(
        'INSERT INTO punishments (user_id, moderator_id, type, reason) VALUES ($1, $2, $3, $4)',
        [userId, message.author.id, 'unban', reason],
      );
  
      const unbanEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Usuário desbanido')
        .setDescription(`**Usuário:** ${userId}\n**Motivo:** ${reason}`)
        .setTimestamp();
  
      if (message.channel instanceof TextChannel) {
        message.channel.send({ embeds: [unbanEmbed] });
      }
    } catch (error) {
      console.error('Erro ao desbanir o usuário:', error);
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Erro')
        .setDescription('Ocorreu um erro ao desbanir o usuário.');
      message.reply({ embeds: [embed] });
    }
  }
  