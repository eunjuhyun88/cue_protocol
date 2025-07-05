#!/bin/bash
# fix-typescript-errors.sh

echo "🔧 TypeScript 에러 수정 시작..."

cd backend

# 1. Crypto import 수정
echo "📦 Crypto import 수정..."
find src -name "*.ts" -exec sed -i '' 's/import crypto from '\''crypto'\'';/import * as crypto from '\''crypto'\'';/g' {} \;

# 2. DatabaseService 수정
echo "🗄️ DatabaseService 타입 수정..."
sed -i '' 's/Database = any;/private Database: any;/g' src/services/database/DatabaseService.ts

# 3. Express 함수 타입 수정 (일부)
echo "🌐 Express 함수 타입 수정..."
find src/routes -name "*.ts" -exec sed -i '' 's/async (req: Request, res: Response) => {/async (req: Request, res: Response): Promise<void> => {/g' {} \;

# 4. 컴파일 테스트
echo "🧪 컴파일 테스트..."
npx tsc --noEmit --skipLibCheck

echo "✅ 수정 완료!"