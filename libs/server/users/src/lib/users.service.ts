import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@exam-planner/shared-types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './user.repository';
import { CatalogService } from '@exam-planner/server-catalog';
import { UsersEntity } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly catalogService: CatalogService
  ) {}

   async findByEmail(email: string): Promise<UsersEntity> {
        const user = await this.usersRepository.findByEmail(email);

        if(!user) throw new NotFoundException("User with email ${email} not found");

        return user;
    }

  async getUsers(role?: UserRole): Promise<UsersEntity[]> {

    const  users=await this.usersRepository.findAll(role);
    if(role && users.length===0){
      throw new NotFoundException('no users found with role ')
    }
    return users;
  }

  async getById(id: number): Promise<UsersEntity> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found!');
    return user;
  }

  async update(id: number, updateUser: UpdateUserDto): Promise<void> {
    if (updateUser.email) {
      const existing = await this.usersRepository.findByEmail(updateUser.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('Esiste già un utente con questa e-mail.');
      }
    }

    const updated = await this.usersRepository.updateOne(id, updateUser);
    if (!updated) {
      throw new NotFoundException('Not found to delete');
    }
  }

  async removeUser(id: number) {
    const deleted = await this.usersRepository.deleteOne(id);
    if (!deleted) {
      throw new NotFoundException('Not found ');
    }
  }

  async create(user: CreateUserDto) {
    const existing = user.email
      ? await this.usersRepository.findByEmail(user.email)
      : null;

    if (existing) {
      throw new ConflictException('Esiste già un utente con questa e-mail.');
    }

    if (user.role === UserRole.TEACHER) {
      for (const degreeProgramId of user.managedDegreeProgramIds ?? []) {
        await this.catalogService.ensureDegreeProgramExists(degreeProgramId);
      }
    }
    const passwordHash = await bcrypt.hash(user.password,10);
    return this.usersRepository.createOne(user,passwordHash);
    
  }
}
