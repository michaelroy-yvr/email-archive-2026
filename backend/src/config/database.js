const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor(dbPath) {
        // Ensure the database directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Initialize database connection
        this.db = new Database(dbPath, { verbose: console.log });

        // Enable WAL mode for better performance
        this.db.pragma('journal_mode = WAL');

        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');

        console.log(`Database initialized at: ${dbPath}`);
    }

    /**
     * Initialize database schema from schema.sql file
     */
    async initialize() {
        try {
            const schemaPath = path.join(__dirname, '../db/schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');

            // Execute schema
            this.db.exec(schema);

            console.log('Database schema initialized successfully');
        } catch (error) {
            console.error('Error initializing database schema:', error);
            throw error;
        }
    }

    /**
     * Run a SQL query (INSERT, UPDATE, DELETE)
     * @param {string} sql - SQL query
     * @param {array} params - Query parameters
     * @returns {object} - Result with lastInsertRowid and changes
     */
    run(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            const result = stmt.run(params);
            return {
                lastID: result.lastInsertRowid,
                changes: result.changes
            };
        } catch (error) {
            console.error('Database run error:', error.message);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw error;
        }
    }

    /**
     * Get a single row
     * @param {string} sql - SQL query
     * @param {array} params - Query parameters
     * @returns {object|undefined} - Single row or undefined
     */
    get(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.get(params);
        } catch (error) {
            console.error('Database get error:', error.message);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw error;
        }
    }

    /**
     * Get all rows
     * @param {string} sql - SQL query
     * @param {array} params - Query parameters
     * @returns {array} - Array of rows
     */
    all(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.all(params);
        } catch (error) {
            console.error('Database all error:', error.message);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw error;
        }
    }

    /**
     * Execute raw SQL (for multiple statements)
     * @param {string} sql - SQL statements
     */
    exec(sql) {
        try {
            return this.db.exec(sql);
        } catch (error) {
            console.error('Database exec error:', error.message);
            throw error;
        }
    }

    /**
     * Begin a transaction
     * @param {function} callback - Transaction callback
     * @returns {any} - Result of transaction
     */
    transaction(callback) {
        const txn = this.db.transaction(callback);
        return txn();
    }

    /**
     * Close database connection
     */
    close() {
        this.db.close();
        console.log('Database connection closed');
    }
}

// Create singleton instance
const dbPath = path.join(__dirname, '../../storage/database/emails.db');
const db = new DatabaseManager(dbPath);

// Export the singleton instance
module.exports = db;
