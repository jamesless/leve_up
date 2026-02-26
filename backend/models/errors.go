package models

import "errors"

var (
	ErrUserNotFound       = errors.New("user not found")
	ErrUserExists         = errors.New("user already exists")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrGameNotFound       = errors.New("game not found")
	ErrGameFull           = errors.New("game is full")
)
