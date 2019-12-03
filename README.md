# ntalk

## 使用環境

#### 1. 建置資料庫

```
    # 建立資料庫名稱 (預設 ntalk)
    # 執行目錄下的 ntalk.sql 建立資料表
```

#### 2. 修改 .env 檔

```
    # 正式環境請設為 false
    DEBUG=false

    # server port
    SERVER_PORT=3000

    # API 認證網址
    ACCESS_CHECK_URL=http://aaa.bb.c

    # DB 相關設定
    DB_HOST=127.0.0.1
    ....
```

#### 3. 於專案目錄下執行 `npm i` 安裝 modules

```
    # 安裝 node_modules
    npm i
```

#### 4. 開啟 logs 資料夾的寫入權限

```
    # 開啟 logs 資料夾的寫入權限 666
```

#### 5. 啟動 server

```
    # 啟動 server
    node ./dist/server

    # 背景執行
    node ./dist/server&>log.out&
```

#### 6. 將 js 載入自家系統

```
    # 將 「http://{ntalk server host}/mosaic/ntalk.js」加入到 body 的最後一行即可
    #  - access-token: 此為當下使用者的 access-token, 此為必填
    #  - host: 此為 ntalk server 的 host, 可省略，未填寫時以此 js 的所在 host 為主
    <script src="http://{host}/mosaic/ntalk.js" access-token="{ACCESS_TOKEN}" host="{HOST}">
```

## 開發環境

#### 1. 於專案目錄下執行 `npm i` 安裝 modules

```
    # 安裝 node_modules
    npm i

    # 安裝 typescript
    npm i -g typescript

    # 以上動作完成後，重開 命令提示字元 (若使用 vscode 的, 請將所有 vscode 關閉後重開)
```

#### 2. Server 端開發, 程式碼: `「./src/*」`

```
    # 需同時執行兩個程序
    # 執行 ts 檔 build watch, 將檔案編譯至 `./dist/*`
    npm run serve-watch

    # 執行 hot reload , 儲存變更後自動重載
    npm run serve
```

#### 3. Client 端開發, 程式碼: `「./resources/*」`

```
    # 使用 laravel-mix build, 執行 hot reload
    npm run start

    # 將 .env 的 DEBUG=true 後，執行 `npm run serve`, 即可於本機端 localhost:3000 看到頁面

```
