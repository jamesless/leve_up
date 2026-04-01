package main

import (
	"fmt"
	"os"
	"strings"
	"time"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "progress":
		handleProgress()
	case "feature":
		handleFeature()
	case "session":
		handleSession()
	default:
		fmt.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Claude Long-Running Agent - Go Implementation")
	fmt.Println("\nUsage: claude-long <command> [subcommand] [args]")
	fmt.Println("\nCommands:")
	fmt.Println("  progress <subcommand>  - Manage progress")
	fmt.Println("    init                 - Initialize progress file")
	fmt.Println("    read                 - Read progress file")
	fmt.Println("    recent [N]           - Show recent N sessions")
	fmt.Println("    add <message>        - Add session entry")
	fmt.Println()
	fmt.Println("  feature <subcommand>   - Manage features")
	fmt.Println("    init                 - Initialize feature list")
	fmt.Println("    list                 - List all features")
	fmt.Println("    next                 - Show next pending feature")
	fmt.Println("    complete <id>        - Mark feature as complete")
	fmt.Println("    summary              - Show feature summary")
	fmt.Println()
	fmt.Println("  session <subcommand>   - Manage sessions")
	fmt.Println("    init                 - Initialize project")
	fmt.Println("    start                - Start new session")
	fmt.Println("    end <summary>        - End session with summary")
}

func handleProgress() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: claude-long progress <subcommand>")
		return
	}

	pm := NewProgressManager("")
	subcommand := os.Args[2]

	switch subcommand {
	case "init":
		pm.Initialize()
	case "read":
		content, _ := pm.Read()
		fmt.Println(content)
	case "recent":
		count := 5
		if len(os.Args) > 3 {
			fmt.Sscanf(os.Args[3], "%d", &count)
		}
		sessions, _ := pm.GetRecentSessions(count)
		for _, session := range sessions {
			fmt.Println(session)
		}
	case "add":
		message := strings.Join(os.Args[3:], " ")
		pm.AddSession(Session{
			Date:          time.Now(),
			CompletedWork: []string{message},
			Status:        "Session completed",
		})
	default:
		fmt.Printf("Unknown subcommand: %s\n", subcommand)
	}
}

func handleFeature() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: claude-long feature <subcommand>")
		return
	}

	fm := NewFeatureManager("")
	subcommand := os.Args[2]

	switch subcommand {
	case "init":
		fm.Initialize(nil)
	case "list":
		features, _ := fm.Load()
		for _, f := range features {
			status := "○"
			if f.Passes {
				status = "✓"
			}
			fmt.Printf("%s [%s] P%d %s\n", status, f.ID, f.Priority, f.Description)
		}
	case "next":
		feature, _ := fm.GetNextPendingFeature()
		if feature != nil {
			fmt.Printf("\nNext feature to work on:\n")
			fmt.Printf("ID: %s\n", feature.ID)
			fmt.Printf("Priority: %d\n", feature.Priority)
			fmt.Printf("Description: %s\n", feature.Description)
			fmt.Println("\nSteps:")
			for i, step := range feature.Steps {
				fmt.Printf("  %d. %s\n", i+1, step)
			}
		} else {
			fmt.Println("🎉 All features completed!")
		}
	case "complete":
		if len(os.Args) < 4 {
			fmt.Println("Usage: claude-long feature complete <id>")
			return
		}
		featureID := os.Args[3]
		fm.MarkAsComplete(featureID, "")
	case "summary":
		summary, _ := fm.GetSummary()
		fmt.Printf("\n📊 Feature Summary\n")
		fmt.Printf("Total: %v\n", summary["total"])
		fmt.Printf("Completed: %v\n", summary["completed"])
		fmt.Printf("Pending: %v\n", summary["pending"])
		fmt.Printf("Completion Rate: %.1f%%\n", summary["completion_rate"].(float64)*100)
	default:
		fmt.Printf("Unknown subcommand: %s\n", subcommand)
	}
}

func handleSession() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: claude-long session <subcommand>")
		return
	}

	sm := NewSessionManager(".")
	subcommand := os.Args[2]

	switch subcommand {
	case "init":
		sm.InitializeProject()
	case "start":
		sm.StartSession()
	case "end":
		summary := "Session completed"
		if len(os.Args) > 3 {
			summary = strings.Join(os.Args[3:], " ")
		}
		sm.EndSession(summary)
	default:
		fmt.Printf("Unknown subcommand: %s\n", subcommand)
	}
}
