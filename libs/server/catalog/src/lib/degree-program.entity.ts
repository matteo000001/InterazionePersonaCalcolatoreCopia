import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('degree_programs')
export class DegreeProgramEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  code!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  // Durata in anni: 3 = laurea triennale, 2 = laurea magistrale.
  // Nullable per i corsi creati prima che il dato fosse salvato nel database.
  @Column({ type: 'int', nullable: true })
  durationYears!: number | null;
}
