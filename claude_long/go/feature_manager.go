package main

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"time"
)

// Feature 表示一个功能项
type Feature struct {
	ID          string   `json:"id"`
	Category    string   `json:"category"`
	Priority    int      `json:"priority"`
	Description string   `json:"description"`
	Steps       []string `json:"steps"`
	Passes      bool     `json:"passes"`
	Notes       string   `json:"notes"`
	CreatedAt   string   `json:"created_at"`
	CompletedAt string   `json:"completed_at,omitempty"`
}

// FeatureManager 管理功能列表
type FeatureManager struct {
	FeatureFile string
}

// NewFeatureManager 创建新的功能管理器
func NewFeatureManager(featureFile string) *FeatureManager {
	if featureFile == "" {
		featureFile = "feature_list.json"
	}
	return &FeatureManager{FeatureFile: featureFile}
}

// Initialize 初始化功能列表文件
func (fm *FeatureManager) Initialize(features []Feature) error {
	if _, err := os.Stat(fm.FeatureFile); err == nil {
		fmt.Printf("Warning: %s already exists\n", fm.FeatureFile)
		return nil
	}

	if features == nil {
		features = []Feature{
			{
				ID:          "F001",
				Category:    "setup",
				Priority:    1,
				Description: "Project initialization",
				Steps:       []string{"Initialize structure", "Setup environment"},
				Passes:      false,
				Notes:       "",
				CreatedAt:   time.Now().Format(time.RFC3339),
			},
		}
	}

	return fm.Save(features)
}

// Load 加载功能列表
func (fm *FeatureManager) Load() ([]Feature, error) {
	data, err := os.ReadFile(fm.FeatureFile)
	if err != nil {
		if os.IsNotExist(err) {
			return []Feature{}, nil
		}
		return nil, err
	}

	var features []Feature
	err = json.Unmarshal(data, &features)
	return features, err
}

// Save 保存功能列表
func (fm *FeatureManager) Save(features []Feature) error {
	data, err := json.MarshalIndent(features, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(fm.FeatureFile, data, 0644)
}

// GetNextPendingFeature 获取下一个待完成的功能
func (fm *FeatureManager) GetNextPendingFeature() (*Feature, error) {
	features, err := fm.Load()
	if err != nil {
		return nil, err
	}

	// 过滤未完成的功能
	var pending []Feature
	for _, f := range features {
		if !f.Passes {
			pending = append(pending, f)
		}
	}

	if len(pending) == 0 {
		return nil, nil
	}

	// 按优先级排序
	sort.Slice(pending, func(i, j int) bool {
		return pending[i].Priority < pending[j].Priority
	})

	return &pending[0], nil
}

// MarkAsComplete 标记功能为完成
func (fm *FeatureManager) MarkAsComplete(featureID, notes string) error {
	features, err := fm.Load()
	if err != nil {
		return err
	}

	found := false
	for i := range features {
		if features[i].ID == featureID {
			features[i].Passes = true
			features[i].CompletedAt = time.Now().Format(time.RFC3339)
			if notes != "" {
				features[i].Notes = notes
			}
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("feature %s not found", featureID)
	}

	err = fm.Save(features)
	if err != nil {
		return err
	}

	fmt.Printf("Marked feature %s as complete\n", featureID)
	return nil
}

// GetSummary 获取功能列表摘要
func (fm *FeatureManager) GetSummary() (map[string]interface{}, error) {
	features, err := fm.Load()
	if err != nil {
		return nil, err
	}

	completed := 0
	for _, f := range features {
		if f.Passes {
			completed++
		}
	}

	completionRate := 0.0
	if len(features) > 0 {
		completionRate = float64(completed) / float64(len(features))
	}

	return map[string]interface{}{
		"total":           len(features),
		"completed":       completed,
		"pending":         len(features) - completed,
		"completion_rate": completionRate,
	}, nil
}
