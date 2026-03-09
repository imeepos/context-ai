# PowerShell 语法参考文档

## 目录

- [基础语法](#基础语法)
- [变量和数据类型](#变量和数据类型)
- [运算符](#运算符)
- [控制流](#控制流)
- [函数和脚本](#函数和脚本)
- [管道和对象](#管道和对象)
- [常用命令 (Cmdlets)](#常用命令-cmdlets)
- [错误处理](#错误处理)
- [文件和目录操作](#文件和目录操作)
- [字符串操作](#字符串操作)
- [数组和哈希表](#数组和哈希表)
- [正则表达式](#正则表达式)
- [模块和包管理](#模块和包管理)
- [最佳实践](#最佳实践)

---

## 基础语法

### 注释

```powershell
# 单行注释

<#
多行注释
可以跨越多行
#>
```

### 命令执行

```powershell
# 执行命令
Get-Process

# 命令别名
gps  # Get-Process 的别名
ls   # Get-ChildItem 的别名
cd   # Set-Location 的别名

# 查看命令帮助
Get-Help Get-Process
Get-Help Get-Process -Examples
Get-Help Get-Process -Full
```

### 命令结构

```powershell
# 基本结构: 动词-名词
Get-Process
Set-Location
New-Item

# 带参数
Get-Process -Name "chrome"
Get-ChildItem -Path "C:\Users" -Recurse

# 参数简写（只要不产生歧义）
Get-ChildItem -Path "C:\" -Rec
```

---

## 变量和数据类型

### 变量声明

```powershell
# 声明变量（使用 $ 前缀）
$name = "John"
$age = 30
$isActive = $true

# 强类型声明
[string]$name = "John"
[int]$age = 30
[bool]$isActive = $true
```

### 基本数据类型

```powershell
# 字符串
$str = "Hello World"
$str = 'Single quotes'

# 数字
$int = 42
$float = 3.14
$long = 1234567890L

# 布尔值
$true
$false

# 空值
$null

# 数组
$array = @(1, 2, 3, 4, 5)
$array = 1, 2, 3, 4, 5  # 简写

# 哈希表
$hash = @{
    Name = "John"
    Age = 30
    City = "New York"
}
```

### 类型转换

```powershell
# 显式转换
[int]"123"           # 字符串转整数
[string]123          # 整数转字符串
[datetime]"2024-01-01"  # 字符串转日期

# 检查类型
$var.GetType()
$var -is [string]
$var -is [int]
```

### 特殊变量

```powershell
$_          # 当前管道对象
$?          # 上一个命令是否成功
$^          # 上一个命令的第一个参数
$$          # 上一个命令的最后一个参数
$args       # 函数参数数组
$PSHome     # PowerShell 安装目录
$HOME       # 用户主目录
$PWD        # 当前工作目录
```

---

## 运算符

### 算术运算符

```powershell
$a = 10
$b = 3

$a + $b    # 加法: 13
$a - $b    # 减法: 7
$a * $b    # 乘法: 30
$a / $b    # 除法: 3.333...
$a % $b    # 取模: 1
```

### 比较运算符

```powershell
# 数值比较
5 -eq 5     # 等于 (Equal)
5 -ne 3     # 不等于 (Not Equal)
5 -gt 3     # 大于 (Greater Than)
5 -ge 5     # 大于等于 (Greater or Equal)
3 -lt 5     # 小于 (Less Than)
3 -le 5     # 小于等于 (Less or Equal)

# 字符串比较（默认不区分大小写）
"hello" -eq "HELLO"    # True
"hello" -ceq "HELLO"   # False (区分大小写)
"hello" -like "hel*"   # 通配符匹配
"hello" -match "^hel"  # 正则匹配
```

### 逻辑运算符

```powershell
$true -and $false   # 与
$true -or $false    # 或
-not $true          # 非
!$true              # 非（简写）
```

### 赋值运算符

```powershell
$x = 10
$x += 5    # $x = $x + 5
$x -= 3    # $x = $x - 3
$x *= 2    # $x = $x * 2
$x /= 4    # $x = $x / 4
$x %= 3    # $x = $x % 3
```

---

## 控制流

### If-ElseIf-Else

```powershell
$age = 25

if ($age -lt 18) {
    Write-Host "未成年"
} elseif ($age -lt 60) {
    Write-Host "成年人"
} else {
    Write-Host "老年人"
}

# 单行 if
if ($age -gt 18) { Write-Host "成年" }
```

### Switch

```powershell
$day = "Monday"

switch ($day) {
    "Monday"    { "星期一" }
    "Tuesday"   { "星期二" }
    "Wednesday" { "星期三" }
    default     { "其他" }
}

# 支持通配符和正则
switch -Wildcard ($filename) {
    "*.txt"  { "文本文件" }
    "*.ps1"  { "PowerShell 脚本" }
    default  { "其他文件" }
}

# 支持多个条件
switch ($value) {
    {$_ -lt 0}  { "负数" }
    {$_ -eq 0}  { "零" }
    {$_ -gt 0}  { "正数" }
}
```

### For 循环

```powershell
# 标准 for 循环
for ($i = 0; $i -lt 10; $i++) {
    Write-Host $i
}

# 倒序循环
for ($i = 10; $i -gt 0; $i--) {
    Write-Host $i
}
```

### ForEach 循环

```powershell
# ForEach 语句
$items = @(1, 2, 3, 4, 5)
foreach ($item in $items) {
    Write-Host $item
}

# ForEach-Object (管道)
$items | ForEach-Object {
    Write-Host $_
}

# 简写
$items | % { Write-Host $_ }
```

### While 循环

```powershell
$i = 0
while ($i -lt 5) {
    Write-Host $i
    $i++
}
```

### Do-While / Do-Until

```powershell
# Do-While (至少执行一次)
$i = 0
do {
    Write-Host $i
    $i++
} while ($i -lt 5)

# Do-Until
$i = 0
do {
    Write-Host $i
    $i++
} until ($i -ge 5)
```

### Break 和 Continue

```powershell
# Break - 跳出循环
for ($i = 0; $i -lt 10; $i++) {
    if ($i -eq 5) { break }
    Write-Host $i
}

# Continue - 跳过当前迭代
for ($i = 0; $i -lt 10; $i++) {
    if ($i % 2 -eq 0) { continue }
    Write-Host $i  # 只输出奇数
}
```

---

## 函数和脚本

### 函数定义

```powershell
# 基本函数
function Say-Hello {
    Write-Host "Hello, World!"
}

# 带参数的函数
function Say-Hello {
    param(
        [string]$Name
    )
    Write-Host "Hello, $Name!"
}

# 带类型和默认值
function Add-Numbers {
    param(
        [int]$a = 0,
        [int]$b = 0
    )
    return $a + $b
}

# 调用函数
Say-Hello -Name "John"
$result = Add-Numbers -a 5 -b 3
```

### 高级函数 (Advanced Functions)

```powershell
function Get-UserInfo {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true, ValueFromPipeline=$true)]
        [string]$Username,

        [Parameter()]
        [switch]$Detailed
    )

    begin {
        Write-Verbose "开始处理..."
    }

    process {
        Write-Host "处理用户: $Username"
        if ($Detailed) {
            # 详细信息
        }
    }

    end {
        Write-Verbose "处理完成"
    }
}
```

### 参数验证

```powershell
function Set-Age {
    param(
        [Parameter(Mandatory=$true)]
        [ValidateRange(0, 150)]
        [int]$Age,

        [ValidateSet("Male", "Female", "Other")]
        [string]$Gender,

        [ValidateNotNullOrEmpty()]
        [string]$Name,

        [ValidatePattern("^\d{3}-\d{3}-\d{4}$")]
        [string]$Phone
    )
}
```

### 脚本块 (Script Blocks)

```powershell
# 定义脚本块
$scriptBlock = {
    param($x, $y)
    return $x + $y
}

# 执行脚本块
& $scriptBlock 5 3
Invoke-Command -ScriptBlock $scriptBlock -ArgumentList 5, 3
```

---

## 管道和对象

### 管道基础

```powershell
# 管道传递对象
Get-Process | Where-Object {$_.CPU -gt 100} | Sort-Object CPU -Descending

# 选择属性
Get-Process | Select-Object Name, CPU, Memory

# 格式化输出
Get-Process | Format-Table Name, CPU, Memory
Get-Process | Format-List *
```

### Where-Object (过滤)

```powershell
# 完整语法
Get-Process | Where-Object {$_.Name -eq "chrome"}

# 简化语法
Get-Process | Where-Object Name -eq "chrome"

# 简写
Get-Process | ? {$_.CPU -gt 100}
```

### Select-Object (选择)

```powershell
# 选择属性
Get-Process | Select-Object Name, CPU

# 选择前 N 个
Get-Process | Select-Object -First 5

# 选择后 N 个
Get-Process | Select-Object -Last 5

# 跳过 N 个
Get-Process | Select-Object -Skip 10

# 去重
Get-Process | Select-Object Name -Unique

# 计算属性
Get-Process | Select-Object Name, @{
    Name = "CPUPercent"
    Expression = {$_.CPU / 100}
}
```

### Sort-Object (排序)

```powershell
# 升序
Get-Process | Sort-Object CPU

# 降序
Get-Process | Sort-Object CPU -Descending

# 多字段排序
Get-Process | Sort-Object CPU, Memory -Descending
```

### Group-Object (分组)

```powershell
# 按属性分组
Get-Process | Group-Object ProcessName

# 统计数量
Get-Process | Group-Object ProcessName | Select-Object Name, Count
```

### Measure-Object (统计)

```powershell
# 计数
Get-Process | Measure-Object

# 求和、平均、最大、最小
Get-Process | Measure-Object CPU -Sum -Average -Maximum -Minimum
```

---

## 常用命令 (Cmdlets)

### 文件系统

```powershell
# 列出文件和目录
Get-ChildItem
Get-ChildItem -Path "C:\Users" -Recurse
Get-ChildItem -Filter "*.txt"

# 创建目录
New-Item -Path "C:\Temp" -ItemType Directory

# 创建文件
New-Item -Path "C:\Temp\test.txt" -ItemType File

# 复制
Copy-Item -Path "source.txt" -Destination "dest.txt"
Copy-Item -Path "C:\Source" -Destination "C:\Dest" -Recurse

# 移动
Move-Item -Path "old.txt" -Destination "new.txt"

# 删除
Remove-Item -Path "file.txt"
Remove-Item -Path "C:\Folder" -Recurse -Force

# 重命名
Rename-Item -Path "old.txt" -NewName "new.txt"

# 测试路径是否存在
Test-Path "C:\file.txt"
```

### 内容操作

```powershell
# 读取文件内容
Get-Content -Path "file.txt"
Get-Content -Path "file.txt" -TotalCount 10  # 前10行
Get-Content -Path "file.txt" -Tail 10        # 后10行

# 写入文件
Set-Content -Path "file.txt" -Value "Hello"

# 追加内容
Add-Content -Path "file.txt" -Value "World"

# 清空文件
Clear-Content -Path "file.txt"
```

### 进程管理

```powershell
# 获取进程
Get-Process
Get-Process -Name "chrome"
Get-Process -Id 1234

# 启动进程
Start-Process "notepad.exe"
Start-Process "notepad.exe" -ArgumentList "file.txt"

# 停止进程
Stop-Process -Name "notepad"
Stop-Process -Id 1234 -Force
```

### 服务管理

```powershell
# 获取服务
Get-Service
Get-Service -Name "wuauserv"

# 启动服务
Start-Service -Name "wuauserv"

# 停止服务
Stop-Service -Name "wuauserv"

# 重启服务
Restart-Service -Name "wuauserv"

# 设置服务启动类型
Set-Service -Name "wuauserv" -StartupType Automatic
```

### 网络操作

```powershell
# 测试网络连接
Test-Connection -ComputerName "google.com"
Test-Connection -ComputerName "192.168.1.1" -Count 4

# 获取网络适配器
Get-NetAdapter
Get-NetIPAddress

# 下载文件
Invoke-WebRequest -Uri "https://example.com/file.zip" -OutFile "file.zip"

# HTTP 请求
Invoke-RestMethod -Uri "https://api.example.com/data" -Method Get
Invoke-RestMethod -Uri "https://api.example.com/data" -Method Post -Body $json
```

---

## 错误处理

### Try-Catch-Finally

```powershell
try {
    # 可能出错的代码
    $result = Get-Content "nonexistent.txt"
} catch {
    # 捕获错误
    Write-Host "发生错误: $_"
    Write-Host "错误类型: $($_.Exception.GetType().FullName)"
}

# 捕获特定类型的错误
try {
    $result = 1 / 0
} catch [System.DivideByZeroException] {
    Write-Host "除零错误"
} catch {
    Write-Host "其他错误"
} finally {
    # 无论是否出错都会执行
    Write-Host "清理资源"
}
```

### 错误处理首选项

```powershell
# 设置错误处理行为
$ErrorActionPreference = "Stop"        # 遇到错误停止执行
$ErrorActionPreference = "Continue"    # 显示错误但继续执行（默认）
$ErrorActionPreference = "SilentlyContinue"  # 忽略错误
$ErrorActionPreference = "Inquire"     # 询问用户如何处理

# 针对单个命令设置
Get-Content "file.txt" -ErrorAction Stop
```

### Throw 抛出错误

```powershell
function Divide {
    param([int]$a, [int]$b)

    if ($b -eq 0) {
        throw "除数不能为零"
    }

    return $a / $b
}
```

---

## 文件和目录操作

### 路径操作

```powershell
# 连接路径
Join-Path "C:\Users" "Documents"

# 获取绝对路径
Resolve-Path ".\file.txt"

# 分割路径
Split-Path "C:\Users\file.txt" -Parent    # C:\Users
Split-Path "C:\Users\file.txt" -Leaf      # file.txt

# 测试路径类型
Test-Path "C:\Users" -PathType Container  # 是否为目录
Test-Path "C:\file.txt" -PathType Leaf    # 是否为文件
```

### 文件属性

```powershell
# 获取文件信息
$file = Get-Item "file.txt"
$file.Name
$file.FullName
$file.Length
$file.CreationTime
$file.LastWriteTime

# 设置文件属性
Set-ItemProperty "file.txt" -Name IsReadOnly -Value $true
```

### 递归操作

```powershell
# 递归查找所有 .txt 文件
Get-ChildItem -Path "C:\Users" -Filter "*.txt" -Recurse

# 递归删除所有 .log 文件
Get-ChildItem -Path "C:\Logs" -Filter "*.log" -Recurse | Remove-Item

# 递归复制目录
Copy-Item -Path "C:\Source" -Destination "C:\Dest" -Recurse
```

---

## 字符串操作

### 字符串插值

```powershell
$name = "John"
$age = 30

# 双引号支持变量插值
"My name is $name and I am $age years old"

# 表达式插值
"Next year I will be $($age + 1) years old"

# 单引号不支持插值
'My name is $name'  # 输出: My name is $name
```

### 字符串方法

```powershell
$str = "Hello World"

# 大小写转换
$str.ToUpper()        # HELLO WORLD
$str.ToLower()        # hello world

# 替换
$str.Replace("World", "PowerShell")  # Hello PowerShell

# 分割
$str.Split(" ")       # @("Hello", "World")

# 截取
$str.Substring(0, 5)  # Hello

# 去除空白
"  hello  ".Trim()    # hello
"  hello  ".TrimStart()
"  hello  ".TrimEnd()

# 包含检查
$str.Contains("World")     # True
$str.StartsWith("Hello")   # True
$str.EndsWith("World")     # True

# 长度
$str.Length           # 11
```

### 字符串格式化

```powershell
# -f 格式化运算符
"{0} is {1} years old" -f "John", 30

# 格式化数字
"{0:N2}" -f 1234.5678    # 1,234.57
"{0:C}" -f 1234.56       # $1,234.56
"{0:P}" -f 0.85          # 85.00%

# Here-String (多行字符串)
$text = @"
这是一个
多行字符串
可以包含变量: $name
"@
```

---

## 数组和哈希表

### 数组操作

```powershell
# 创建数组
$array = @(1, 2, 3, 4, 5)
$array = 1..10  # 范围运算符

# 访问元素
$array[0]       # 第一个元素
$array[-1]      # 最后一个元素
$array[0..2]    # 前三个元素

# 数组长度
$array.Length
$array.Count

# 添加元素
$array += 6

# 数组方法
$array.Contains(3)
$array.IndexOf(3)
[array]::Reverse($array)
[array]::Sort($array)

# 数组操作
$array | Where-Object {$_ -gt 3}
$array | ForEach-Object {$_ * 2}
$array | Select-Object -First 3
```

### 哈希表操作

```powershell
# 创建哈希表
$hash = @{
    Name = "John"
    Age = 30
    City = "New York"
}

# 访问值
$hash["Name"]
$hash.Name

# 添加/修改键值
$hash["Email"] = "john@example.com"
$hash.Phone = "123-456-7890"

# 删除键
$hash.Remove("Email")

# 检查键是否存在
$hash.ContainsKey("Name")

# 遍历哈希表
foreach ($key in $hash.Keys) {
    Write-Host "$key : $($hash[$key])"
}

# 获取所有键和值
$hash.Keys
$hash.Values
```

### 有序字典

```powershell
# 保持插入顺序
$ordered = [ordered]@{
    First = 1
    Second = 2
    Third = 3
}
```

---

## 正则表达式

### 匹配操作

```powershell
# -match 运算符
"hello123" -match "\d+"        # True
"hello123" -match "^\w+\d+$"  # True

# 提取匹配结果
if ("hello123" -match "(\w+)(\d+)") {
    $Matches[0]  # hello123 (完整匹配)
    $Matches[1]  # hello (第一个捕获组)
    $Matches[2]  # 123 (第二个捕获组)
}
```

### Select-String (类似 grep)

```powershell
# 在文件中搜索
Select-String -Path "*.txt" -Pattern "error"

# 递归搜索
Get-ChildItem -Recurse | Select-String -Pattern "TODO"

# 显示上下文
Select-String -Path "log.txt" -Pattern "error" -Context 2,2
```

### 替换操作

```powershell
# -replace 运算符
"hello123" -replace "\d+", "456"  # hello456

# 正则捕获组替换
"John Doe" -replace "(\w+) (\w+)", '$2, $1'  # Doe, John
```

---

## 模块和包管理

### 模块管理

```powershell
# 列出已安装的模块
Get-Module -ListAvailable

# 导入模块
Import-Module ModuleName

# 查看模块命令
Get-Command -Module ModuleName

# 查找模块
Find-Module -Name "ModuleName"

# 安装模块
Install-Module -Name "ModuleName"

# 更新模块
Update-Module -Name "ModuleName"

# 卸载模块
Uninstall-Module -Name "ModuleName"
```

### PowerShell Gallery

```powershell
# 设置 PSGallery 为受信任的仓库
Set-PSRepository -Name PSGallery -InstallationPolicy Trusted

# 搜索模块
Find-Module -Name "*Azure*"

# 安装特定版本
Install-Module -Name "ModuleName" -RequiredVersion "1.2.3"
```

---

## 最佳实践

### 命名规范

```powershell
# 使用批准的动词
Get-Verb  # 查看批准的动词列表

# 函数命名: 动词-名词
function Get-UserData { }
function Set-Configuration { }
function New-Report { }

# 变量命名: 驼峰命名法
$userName
$totalCount
$isActive
```

### 参数处理

```powershell
function Do-Something {
    [CmdletBinding()]
    param(
        # 必需参数
        [Parameter(Mandatory=$true)]
        [string]$Name,

        # 可选参数带默认值
        [Parameter()]
        [int]$Count = 10,

        # 开关参数
        [Parameter()]
        [switch]$Force,

        # 管道输入
        [Parameter(ValueFromPipeline=$true)]
        [string]$InputObject
    )

    process {
        # 处理逻辑
    }
}
```

### 错误处理最佳实践

```powershell
function Safe-Operation {
    [CmdletBinding()]
    param([string]$Path)

    try {
        # 设置严格模式
        Set-StrictMode -Version Latest

        # 操作
        $result = Get-Content $Path -ErrorAction Stop

        return $result
    } catch [System.IO.FileNotFoundException] {
        Write-Error "文件未找到: $Path"
        return $null
    } catch {
        Write-Error "发生错误: $_"
        throw
    }
}
```

### 性能优化

```powershell
# 使用 ArrayList 而非数组追加
$list = [System.Collections.ArrayList]@()
$list.Add("item") | Out-Null

# 避免在循环中使用 +=
# 差的做法
$result = @()
foreach ($item in $items) {
    $result += $item
}

# 好的做法
$result = foreach ($item in $items) {
    $item
}

# 使用 -Filter 而非 Where-Object (在文件系统操作中)
Get-ChildItem -Filter "*.txt"  # 快
Get-ChildItem | Where-Object {$_.Extension -eq ".txt"}  # 慢
```

### 脚本模板

```powershell
<#
.SYNOPSIS
    脚本简短描述
.DESCRIPTION
    脚本详细描述
.PARAMETER Name
    参数描述
.EXAMPLE
    .\script.ps1 -Name "John"
.NOTES
    作者: Your Name
    日期: 2024-01-01
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$Name
)

# 设置严格模式
Set-StrictMode -Version Latest

# 错误处理
$ErrorActionPreference = "Stop"

try {
    # 主逻辑
    Write-Verbose "开始处理..."

    # 你的代码

    Write-Verbose "处理完成"
} catch {
    Write-Error "脚本执行失败: $_"
    exit 1
}
```

### 调试技巧

```powershell
# 设置断点
Set-PSBreakpoint -Script "script.ps1" -Line 10

# 查看变量
Get-Variable

# 详细输出
$VerbosePreference = "Continue"
Write-Verbose "调试信息"

# 调试输出
$DebugPreference = "Continue"
Write-Debug "调试信息"

# 测试模式
$WhatIfPreference = $true
Remove-Item "file.txt" -WhatIf
```

---

## 常用快捷键

```powershell
# 命令历史
Get-History              # 查看历史命令
Invoke-History 5         # 执行第5条历史命令
r 5                      # 简写

# Tab 补全
Get-Pro<Tab>            # 自动补全为 Get-Process

# Ctrl+R                 # 搜索历史命令
# Ctrl+C                 # 中断当前命令
# Ctrl+L                 # 清屏
# F7                     # 显示命令历史窗口
```

---

## 实用示例

### 批量重命名文件

```powershell
# 将所有 .txt 文件重命名为 .bak
Get-ChildItem -Filter "*.txt" | Rename-Item -NewName {$_.Name -replace '\.txt$','.bak'}
```

### 查找大文件

```powershell
# 查找大于 100MB 的文件
Get-ChildItem -Recurse | Where-Object {$_.Length -gt 100MB} | Sort-Object Length -Descending
```

### 监控文件变化

```powershell
# 监控目录变化
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = "C:\Temp"
$watcher.EnableRaisingEvents = $true

Register-ObjectEvent $watcher "Created" -Action {
    Write-Host "文件创建: $($Event.SourceEventArgs.Name)"
}
```

### 定时任务

```powershell
# 创建计划任务
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\script.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -TaskName "MyTask" -Action $action -Trigger $trigger
```

### CSV 处理

```powershell
# 导入 CSV
$data = Import-Csv "data.csv"

# 处理数据
$data | Where-Object {$_.Age -gt 30} | Select-Object Name, Age

# 导出 CSV
$data | Export-Csv "output.csv" -NoTypeInformation
```

### JSON 处理

```powershell
# 解析 JSON
$json = Get-Content "data.json" | ConvertFrom-Json

# 转换为 JSON
$object | ConvertTo-Json -Depth 10 | Out-File "output.json"
```

### XML 处理

```powershell
# 读取 XML
[xml]$xml = Get-Content "data.xml"

# 访问节点
$xml.root.element

# 修改 XML
$xml.root.element = "new value"
$xml.Save("data.xml")
```

### 系统信息

```powershell
# 获取系统信息
Get-ComputerInfo

# CPU 信息
Get-WmiObject Win32_Processor

# 内存信息
Get-WmiObject Win32_PhysicalMemory

# 磁盘信息
Get-WmiObject Win32_LogicalDisk

# 操作系统信息
Get-WmiObject Win32_OperatingSystem
```

### 远程执行

```powershell
# 启用远程管理
Enable-PSRemoting -Force

# 远程执行命令
Invoke-Command -ComputerName "Server01" -ScriptBlock {
    Get-Process
}

# 远程会话
$session = New-PSSession -ComputerName "Server01"
Invoke-Command -Session $session -ScriptBlock { Get-Service }
Remove-PSSession $session
```

---

## 参考资源

- [PowerShell 官方文档](https://docs.microsoft.com/powershell/)
- [PowerShell Gallery](https://www.powershellgallery.com/)
- [about_* 帮助主题](https://docs.microsoft.com/powershell/module/microsoft.powershell.core/about/)

```powershell
# 查看所有 about 主题
Get-Help about_*

# 更新帮助文档
Update-Help
```

---

## 附录：常用别名

| 别名 | 完整命令 | 说明 |
|------|---------|------|
| `ls`, `dir` | `Get-ChildItem` | 列出文件 |
| `cd`, `chdir` | `Set-Location` | 切换目录 |
| `pwd` | `Get-Location` | 当前目录 |
| `cp`, `copy` | `Copy-Item` | 复制 |
| `mv`, `move` | `Move-Item` | 移动 |
| `rm`, `del` | `Remove-Item` | 删除 |
| `cat`, `type` | `Get-Content` | 读取文件 |
| `echo`, `write` | `Write-Output` | 输出 |
| `ps`, `gps` | `Get-Process` | 进程列表 |
| `kill` | `Stop-Process` | 停止进程 |
| `cls`, `clear` | `Clear-Host` | 清屏 |
| `man`, `help` | `Get-Help` | 帮助 |
| `?`, `where` | `Where-Object` | 过滤 |
| `%`, `foreach` | `ForEach-Object` | 遍历 |
| `select` | `Select-Object` | 选择 |
| `sort` | `Sort-Object` | 排序 |

```powershell
# 查看所有别名
Get-Alias

# 查看特定命令的别名
Get-Alias -Definition Get-ChildItem

# 创建自定义别名
Set-Alias -Name ll -Value Get-ChildItem
```

---

**文档完成！** 这份 PowerShell 语法参考文档涵盖了从基础到高级的所有常用功能。
