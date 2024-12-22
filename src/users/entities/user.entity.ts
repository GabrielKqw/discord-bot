import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  discordId: string;

  @Column()
  username: string;

  @Column()
  discriminator: string;

  @Column({ default: false })
  isMuted: boolean;
}
