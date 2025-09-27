const db = require('../config/database');

class User {
  static async findOrCreate(userId, username, firstName) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, row) => {
        if (err) reject(err);
        
        if (!row) {
          db.run('INSERT INTO users (user_id, username, first_name) VALUES (?, ?, ?)',
            [userId, username, firstName], function(err) {
              if (err) reject(err);
              resolve({ id: this.lastID, isNew: true });
            });
        } else {
          resolve({ ...row, isNew: false });
        }
      });
    });
  }

  static async getSaldo(userId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT saldo FROM users WHERE user_id = ?', [userId], (err, row) => {
        if (err) reject(err);
        resolve(row ? row.saldo : 0);
      });
    });
  }

  static async updateSaldo(userId, amount) {
    return new Promise((resolve, reject) => {
      db.run('UPDATE users SET saldo = saldo + ? WHERE user_id = ?', 
        [amount, userId], function(err) {
          if (err) reject(err);
          resolve(this.changes);
        });
    });
  }
}

module.exports = User;