import { db } from '../database';
import { User } from '../../../shared/types';

export class UserRepo {
  static getById(id: string): User | null {
    return (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User) || null;
  }

  static getByEmail(email: string): User | null {
    return (db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User) || null;
  }

  static create(user: User): User {
    db.prepare(`
      INSERT INTO users (id, name, email, role, court_station, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, user.name, user.email, user.role, user.court_station, new Date().toISOString());

    return user;
  }

  static listAll(): User[] {
    return db.prepare('SELECT * FROM users ORDER BY name ASC').all() as User[];
  }
}
