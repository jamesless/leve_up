package models

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

var db *sql.DB

// Database configuration
const (
	DBHost     = "localhost"
	DBPort     = 5432
	DBUser     = "postgres"
	DBPassword = "jamesless99*"
	DBName     = "level_up"
	SSLMode    = "disable"
)

// InitDB initializes the database connection and creates tables
func InitDB() error {
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		DBHost, DBPort, DBUser, DBPassword, DBName, SSLMode)

	var err error
	db, err = sql.Open("postgres", psqlInfo)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	log.Println("Database connected successfully")

	// Create tables
	if err := createTables(); err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	return nil
}

// GetDB returns the database instance
func GetDB() *sql.DB {
	return db
}

// createTables creates all necessary tables
func createTables() error {
	// Create users table
	usersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id VARCHAR(64) PRIMARY KEY,
		username VARCHAR(50) UNIQUE NOT NULL,
		password VARCHAR(255) NOT NULL,
		level VARCHAR(10) DEFAULT '2',
		wins INT DEFAULT 0,
		losses INT DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`

	if _, err := db.Exec(usersTable); err != nil {
		return fmt.Errorf("failed to create users table: %w", err)
	}

	// Create index on username
	if _, err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`); err != nil {
		log.Println("Warning: failed to create username index:", err)
	}

	// Create games table
	gamesTable := `
	CREATE TABLE IF NOT EXISTS games (
		id VARCHAR(64) PRIMARY KEY,
		name VARCHAR(100) NOT NULL,
		host_id VARCHAR(64) NOT NULL,
		max_players INT DEFAULT 5,
		status VARCHAR(20) DEFAULT 'waiting',
		current_level VARCHAR(10) DEFAULT '2',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
	)`

	if _, err := db.Exec(gamesTable); err != nil {
		return fmt.Errorf("failed to create games table: %w", err)
	}

	// Create game_players table for many-to-many relationship
	gamePlayersTable := `
	CREATE TABLE IF NOT EXISTS game_players (
		id SERIAL PRIMARY KEY,
		game_id VARCHAR(64) NOT NULL,
		user_id VARCHAR(64) NOT NULL,
		seat_number INT DEFAULT 0,
		joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		UNIQUE (game_id, user_id)
	)`

	if _, err := db.Exec(gamePlayersTable); err != nil {
		return fmt.Errorf("failed to create game_players table: %w", err)
	}

	// Create game_records table for game history
	gameRecordsTable := `
	CREATE TABLE IF NOT EXISTS game_records (
		id SERIAL PRIMARY KEY,
		game_id VARCHAR(64) NOT NULL,
		user_id VARCHAR(64) NOT NULL,
		old_level VARCHAR(10) NOT NULL,
		new_level VARCHAR(10) NOT NULL,
		is_winner BOOLEAN DEFAULT FALSE,
		score INT DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	)`

	if _, err := db.Exec(gameRecordsTable); err != nil {
		return fmt.Errorf("failed to create game_records table: %w", err)
	}

	// Create game_action_logs table for recording all game actions
	gameActionLogsTable := `
	CREATE TABLE IF NOT EXISTS game_action_logs (
		id SERIAL PRIMARY KEY,
		game_id VARCHAR(64) NOT NULL,
		action_type VARCHAR(50) NOT NULL,
		player_seat INT NOT NULL,
		player_id VARCHAR(64),
		action_data JSONB NOT NULL,
		result_data JSONB,
		timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
		FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE SET NULL
	)`

	if _, err := db.Exec(gameActionLogsTable); err != nil {
		return fmt.Errorf("failed to create game_action_logs table: %w", err)
	}

	// Create index on game_id and timestamp for efficient querying
	if _, err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_game_action_logs_game_id_timestamp ON game_action_logs(game_id, timestamp)`); err != nil {
		log.Println("Warning: failed to create game_action_logs index:", err)
	}

	// Create game_replays table for storing complete game replay data
	gameReplaysTable := `
	CREATE TABLE IF NOT EXISTS game_replays (
		id SERIAL PRIMARY KEY,
		game_id VARCHAR(64) UNIQUE NOT NULL,
		initial_state JSONB NOT NULL,
		final_state JSONB NOT NULL,
		total_actions INT DEFAULT 0,
		duration_seconds INT DEFAULT 0,
		winner_team VARCHAR(20),
		final_score INT DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
	)`

	if _, err := db.Exec(gameReplaysTable); err != nil {
		return fmt.Errorf("failed to create game_replays table: %w", err)
	}

	log.Println("Database tables created/verified successfully")
	return nil
}
