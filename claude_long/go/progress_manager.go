package main

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// ProgressManager 管理项目进度文件
type ProgressManager struct {
	ProgressFile string
}

// Session 表示一个会话记录
type Session struct {
	SessionNumber int
	Date          time.Time
	CompletedWork []string
	Status        string
	NextSteps     []string
	Notes         string
}

// NewProgressManager 创建新的进度管理器
func NewProgressManager(progressFile string) *ProgressManager {
	if progressFile == "" {
		progressFile = "claude-progress.txt"
	}
	return &ProgressManager{
		ProgressFile: progressFile,
	}
}

// Initialize 初始化进度文件
func (pm *ProgressManager) Initialize() error {
	if _, err := os.Stat(pm.ProgressFile); err == nil {
		fmt.Printf("Warning: %s already exists\n", pm.ProgressFile)
		return nil
	}

	initialContent := `# Claude Long-Running Agent Progress Log

This file tracks the progress of long-running agent sessions.
Each session should record:
- What was accomplished
- Current status
- Any issues or blockers
- Next steps

格式：
=== Session N: YYYY-MM-DD HH:MM ===
Completed:
- Task 1
- Task 2

Status: Current project state
Next: What needs to be done next

---
`

	err := os.WriteFile(pm.ProgressFile, []byte(initialContent), 0644)
	if err != nil {
		return fmt.Errorf("failed to initialize progress file: %w", err)
	}

	fmt.Printf("Initialized progress file: %s\n", pm.ProgressFile)
	return nil
}

// Read 读取整个进度文件
func (pm *ProgressManager) Read() (string, error) {
	data, err := os.ReadFile(pm.ProgressFile)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	return string(data), nil
}

// GetRecentSessions 获取最近的几个会话记录
func (pm *ProgressManager) GetRecentSessions(count int) ([]string, error) {
	content, err := pm.Read()
	if err != nil {
		return nil, err
	}

	sessions := strings.Split(content, "=== Session")

	// 移除文件头部说明
	if len(sessions) > 0 && strings.Contains(sessions[0], "Progress Log") {
		sessions = sessions[1:]
	}

	// 获取最近的 N 个会话
	start := len(sessions) - count
	if start < 0 {
		start = 0
	}
	recent := sessions[start:]

	// 重新添加会话标记
	result := make([]string, len(recent))
	for i, s := range recent {
		result[i] = "=== Session" + s
	}

	return result, nil
}

// AddSession 添加新的会话记录
func (pm *ProgressManager) AddSession(session Session) error {
	// 自动确定会话编号
	if session.SessionNumber == 0 {
		content, _ := pm.Read()
		session.SessionNumber = strings.Count(content, "=== Session") + 1
	}

	// 构建会话记录
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("\n=== Session %d: %s ===\n",
		session.SessionNumber,
		session.Date.Format("2006-01-02 15:04")))

	if len(session.CompletedWork) > 0 {
		sb.WriteString("\nCompleted:\n")
		for _, work := range session.CompletedWork {
			sb.WriteString(fmt.Sprintf("- %s\n", work))
		}
	}

	if session.Status != "" {
		sb.WriteString(fmt.Sprintf("\nStatus: %s\n", session.Status))
	}

	if len(session.NextSteps) > 0 {
		sb.WriteString("\nNext Steps:\n")
		for _, step := range session.NextSteps {
			sb.WriteString(fmt.Sprintf("- %s\n", step))
		}
	}

	if session.Notes != "" {
		sb.WriteString(fmt.Sprintf("\nNotes:\n%s\n", session.Notes))
	}

	sb.WriteString("\n---\n")

	// 追加到文件
	f, err := os.OpenFile(pm.ProgressFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()

	_, err = f.WriteString(sb.String())
	if err != nil {
		return err
	}

	fmt.Printf("Added Session %d to %s\n", session.SessionNumber, pm.ProgressFile)
	return nil
}

// GetSummary 获取进度摘要
func (pm *ProgressManager) GetSummary() (map[string]interface{}, error) {
	content, err := pm.Read()
	if err != nil {
		return nil, err
	}

	sessionCount := strings.Count(content, "=== Session")
	recentSessions, _ := pm.GetRecentSessions(3)

	fileInfo, _ := os.Stat(pm.ProgressFile)
	var fileSize int64 = 0
	if fileInfo != nil {
		fileSize = fileInfo.Size()
	}

	return map[string]interface{}{
		"total_sessions":  sessionCount,
		"recent_sessions": recentSessions,
		"file_size":       fileSize,
	}, nil
}

// ArchiveOldSessions 归档旧的会话记录
func (pm *ProgressManager) ArchiveOldSessions(keepRecent int) error {
	content, err := pm.Read()
	if err != nil {
		return err
	}

	sessions := strings.Split(content, "=== Session")

	// 保留文件头部说明
	header := ""
	if len(sessions) > 0 && strings.Contains(sessions[0], "Progress Log") {
		header = sessions[0]
		sessions = sessions[1:]
	}

	if len(sessions) <= keepRecent {
		fmt.Println("No sessions to archive")
		return nil
	}

	// 分离要归档的和要保留的
	toArchive := sessions[:len(sessions)-keepRecent]
	toKeep := sessions[len(sessions)-keepRecent:]

	// 创建归档文件
	archiveFile := strings.Replace(pm.ProgressFile, ".txt", "-archive.txt", 1)
	timestamp := time.Now().Format("20060102-150405")

	archiveContent := fmt.Sprintf("\n\n# Archived on %s\n\n", timestamp)
	archiveContent += "=== Session" + strings.Join(toArchive, "=== Session")

	// 追加到归档文件
	f, err := os.OpenFile(archiveFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()
	f.WriteString(archiveContent)

	// 重写主文件
	newContent := header + "=== Session" + strings.Join(toKeep, "=== Session")
	err = os.WriteFile(pm.ProgressFile, []byte(newContent), 0644)
	if err != nil {
		return err
	}

	fmt.Printf("Archived %d sessions to %s\n", len(toArchive), archiveFile)
	fmt.Printf("Kept %d recent sessions in %s\n", len(toKeep), pm.ProgressFile)

	return nil
}
