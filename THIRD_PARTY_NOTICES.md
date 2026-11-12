# 第三方与数据说明

本项目没有复制 Oolimo、iReal Pro 或其他网站的代码与和弦图库，没有导入 chords-db、ChordOptions 或其他第三方音乐数据。

音乐公式、八个进行、钢琴转位规则、吉他候选生成与 SVG 绘图由本项目实现。吉他候选为规则生成，未标为人工筛选；Dm7 的 `[-1,5,7,5,6,5]` 可核验例子来自用户提供的需求文档。需求文档副本保存在 `docs/requirements.md`。

直接使用的开源软件（实际版本见 package-lock.json；安装包内保留原许可）：

| 软件                            | 来源                                               | 许可证                                    | 用途       |
| ------------------------------- | -------------------------------------------------- | ----------------------------------------- | ---------- |
| React / React DOM               | https://github.com/facebook/react                  | MIT · Meta Platforms, Inc. and affiliates | 界面       |
| Vite / plugin-react             | https://github.com/vitejs/vite                     | MIT · Vite contributors                   | 开发与构建 |
| TypeScript                      | https://github.com/microsoft/TypeScript            | Apache-2.0 · Microsoft Corporation        | 类型检查   |
| Vitest                          | https://github.com/vitest-dev/vitest               | MIT · Vitest contributors                 | 单元测试   |
| Playwright                      | https://github.com/microsoft/playwright            | Apache-2.0 · Microsoft Corporation        | 浏览器验收 |
| Prettier                        | https://github.com/prettier/prettier               | MIT · James Long and contributors         | 格式化     |
| @types/react / @types/react-dom | https://github.com/DefinitelyTyped/DefinitelyTyped | MIT · DefinitelyTyped contributors        | 类型定义   |

接入日期：2026-11-13（Asia/Tokyo）。传递依赖与精确版本均由 lockfile 记录，许可文件随 npm 安装包保留。运行时不加载外部字体、音源或统计服务。
