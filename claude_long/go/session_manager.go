package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// SessionManager 管理会话
type SessionManager struct {
	ProjectDir      string
	ProgressManager *ProgressManager
	FeatureManager  *FeatureManager
}

// NewSessionManager 创建新的会话管理器
func NewSessionManager(projectDir string) *SessionManager {
	if projectDir == "" {
		projectDir = "."
	}
	absPath, _ := filepath.Abs(projectDir)

	return &SessionManager{
		ProjectDir:      absPath,
		ProgressManager: NewProgressManager(filepath.Join(absPath, "claude-progress.txt")),
		FeatureManager:  NewFeatureManager(filepath.Join(absPath, "feature_list.json")),
	}
}

// InitializeProject 初始化新项目
func (sm *SessionManager) InitializeProject() error {
	fmt.Println("🚀 Initializing long-running agent project...")

	// 初始化 Git
	gitDir := filepath.Join(sm.ProjectDir, ".git")
	if _, err := os.Stat(gitDir); os.IsNotExist(err) {
		fmt.Println("Initializing Git repository...")
		cmd := exec.Command("git", "init")
		cmd.Dir = sm.ProjectDir
		if err := cmd.Run(); err != nil {
			fmt.Printf("Warning: Failed to initialize git: %v\n", err)
		}
	}

	// 初始化进度文件
	fmt.Println("Creating progress file...")
	if err := sm.ProgressManager.Initialize(); err != nil {
		return err
	}

	// 初始化功能列表
	fmt.Println("Creating feature list...")
	if err := sm.FeatureManager.Initialize(nil); err != nil {
		return err
	}

	// 添加初始会话记录
	sm.ProgressManager.AddSession(Session{
		Date: time.Now(),
		CompletedWork: []string{
			"Initialized project structure",
			"Created progress tracking file",
			"Set up feature list",
		},
		Status: "Project initialized and ready for development",
		NextSteps: []string{
			"Begin working on first feature",
		},
	})

	fmt.Println("\n✅ Project initialized successfully!")
	fmt.Printf("📁 Project directory: %s\n", sm.ProjectDir)
	return nil
}

// StartSession 开始新的编码会话
func (sm *SessionManager) StartSession() error {
	fmt.Println("🔄 Starting new coding session...")
	fmt.Printf("📁 Working directory: %s\n\n", sm.ProjectDir)

	// 读取进度
	fmt.Println("📖 Reading progress file...")
	progress, err := sm.ProgressManager.GetRecentSessions(3)
	if err != nil {
		return err
	}
	for _, session := range progress {
		if len(session) > 200 {
			fmt.Println(session[:200] + "...")
		} else {
			fmt.Println(session)
		}
	}

	// 读取功能列表
	fmt.Println("\n📋 Loading feature list...")
	summary, err := sm.FeatureManager.GetSummary()
	if err != nil {
		return err
	}
	fmt.Printf("Total features: %v\n", summary["total"])
	fmt.Printf("Completed: %v\n", summary["completed"])
	fmt.Printf("Pending: %v\n", summary["pending"])

	// 获取下一个功能
	fmt.Println("\n🎯 Next feature to work on:")
	nextFeature, err := sm.FeatureManager.GetNextPendingFeature()
	if err != nil {
		return err
	}
	if nextFeature != nil {
		fmt.Printf("ID: %s\n", nextFeature.ID)
		fmt.Printf("Priority: %d\n", nextFeature.Priority)
		fmt.Printf("Description: %s\n", nextFeature.Description)
		fmt.Println("\nImplementation steps:")
		for i, step := range nextFeature.Steps {
			fmt.Printf("  %d. %s\n", i+1, step)
		}
	} else {
		fmt.Println("🎉 All features completed!")
	}

	fmt.Println("\n✅ Session started! Remember to:")
	fmt.Println("  1. Work on ONE feature at a time")
	fmt.Println("  2. Test thoroughly before marking complete")
	fmt.Println("  3. Commit changes with descriptive messages")

	return nil
}

// EndSession 结束当前会话
func (sm *SessionManager) EndSession(summary string) error {
	fmt.Println("🏁 Ending session...")

	err := sm.ProgressManager.AddSession(Session{
		Date:          time.Now(),
		CompletedWork: []string{summary},
		Status:        "Session completed",
	})
	if err != nil {
		return err
	}

	fmt.Println("\n✅ Session ended successfully!")
	return nil
}
