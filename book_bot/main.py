#!/usr/bin/env python3
"""Unified Books Bot Entry Point.

This script starts the unified bot that handles both admin management 
and user book requests from a single interface.
"""

import sys
import os
from pathlib import Path

# Add the current directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

try:
    import unified_bot
except ImportError as e:
    print(f"Error importing unified_bot: {e}")
    sys.exit(1)

def main():
    print("=" * 40)
    print("🚀 UNIFIED BOOKS BOT STARTING")
    print("=" * 40)
    
    try:
        unified_bot.main()
    except KeyboardInterrupt:
        print("\n👋 Bot stopped by user.")
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
        sys.exit(1)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
