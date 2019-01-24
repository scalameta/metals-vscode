## Change Log

### v1.2.0

- [#58](https://github.com/scalameta/metals-vscode/pull/58) Merge pull request
  #58 from olafurpg/java-home (@olafurpg)
- [#57](https://github.com/scalameta/metals-vscode/pull/57) Merge pull request
  #57 from olafurpg/jvmopts (@olafurpg)
- [e0ada25](https://github.com/scalameta/metals-vscode/commit/e0ada2559ccd45aecd24765da45564e357e65503)
  Select latest JVM version when possible. (@olafurpg)
- [b50bb51](https://github.com/scalameta/metals-vscode/commit/b50bb518b55732ee6bce4281732ccfc2d84dbbb3)
  Use non-meory JVM options from .jvmopts file, fixes #45. (@olafurpg)
- [#55](https://github.com/scalameta/metals-vscode/pull/55) Merge pull request
  #55 from olafurpg/doctor-reload (@olafurpg)
- [#56](https://github.com/scalameta/metals-vscode/pull/56) Merge pull request
  #56 from olafurpg/discoverability (@olafurpg)
- [e61ab8c](https://github.com/scalameta/metals-vscode/commit/e61ab8cd62c5f742706670538f1a27165704fb88)
  Rename Marketplace extension to "Scala (Metals)" for discoverability.
  (@olafurpg)
- [705eae6](https://github.com/scalameta/metals-vscode/commit/705eae65f13d5418b910cabfafb6498a3c3891b7)
  Focus on webview when running doctor, fixes #52. (@olafurpg)
- [#54](https://github.com/scalameta/metals-vscode/pull/54) Merge pull request
  #54 from olafurpg/input-box (@olafurpg)
- [1d36f56](https://github.com/scalameta/metals-vscode/commit/1d36f568fdd94b966bb77a6eadab4f292d86a738)
  Add -Dmetals.input-box property, fixes #53. (@olafurpg)
- [#51](https://github.com/scalameta/metals-vscode/pull/51) Merge pull request
  #51 from olafurpg/cascade (@olafurpg)
- [fee33e0](https://github.com/scalameta/metals-vscode/commit/fee33e0a89c67b2f5bebafa2cf7fe2fef17b121f)
  Add "cascade compile" and "cancel compile" tasks. (@olafurpg)
- [#50](https://github.com/scalameta/metals-vscode/pull/50) Merge pull request
  #50 from olafurpg/status-command (@olafurpg)
- [3470a79](https://github.com/scalameta/metals-vscode/commit/3470a795aa60cefc6626c6131d4962c7635a06a3)
  Upgrade TS to 3.2.2 (@gabro)
- [#1](https://github.com/scalameta/metals-vscode/pull/1) Merge pull request #1
  from gabro/status-command-refactor (@gabro)
- [ff2f34a](https://github.com/scalameta/metals-vscode/commit/ff2f34aea2a66a6a62346d379bc9e23a2d2ce9df)
  Make clientCommands more robust towards addition/removal of commands (@gabro)
- [#48](https://github.com/scalameta/metals-vscode/pull/48) Merge pull request
  #48 from olafurpg/memory (@olafurpg)
- [#49](https://github.com/scalameta/metals-vscode/pull/49) Merge pull request
  #49 from olafurpg/java-home-hint (@olafurpg)
- [fecf7d4](https://github.com/scalameta/metals-vscode/commit/fecf7d45a142ed75fb18c151b277969d24b01b54)
  Ensure all registered command are registered as context subscriptions.
  (@olafurpg)
- [21722bf](https://github.com/scalameta/metals-vscode/commit/21722bfa2e14e30ada54b73ab5535071aec09777)
  Synchronize client commands with latest Metals. (@olafurpg)
- [d1a1b9e](https://github.com/scalameta/metals-vscode/commit/d1a1b9e222dc6cd26bc1586dc14ca75d422667f4)
  Add mis-configured Java Home as possible reason for download error (@olafurpg)
- [7fd5396](https://github.com/scalameta/metals-vscode/commit/7fd53963c98f4ffd3e00fb0dbe454272214a6145)
  Reduce default memory settings (@olafurpg)
- [#43](https://github.com/scalameta/metals-vscode/pull/43) Merge pull request
  #43 from olafurpg/server-properties-reload (@olafurpg)
- [#44](https://github.com/scalameta/metals-vscode/pull/44) Merge pull request
  #44 from olafurpg/input-box (@olafurpg)
- [1612f14](https://github.com/scalameta/metals-vscode/commit/1612f14f521cb1b40b8ae30bde56274eb704b353)
  Implement metals/inputBox extension (@olafurpg)
- [2d12484](https://github.com/scalameta/metals-vscode/commit/2d124849932f389ab2c24c0f3cd2e455a1b6fd5a)
  Ask to reload window on changes to server properties. (@olafurpg)
- [#40](https://github.com/scalameta/metals-vscode/pull/40) Merge pull request
  #40 from gabro/new-features (@gabro)
- [d400f0a](https://github.com/scalameta/metals-vscode/commit/d400f0aff620ecc7998ecaa36f6c4f1cd3cfca1d)
  Update features overview (@gabro)
- [#39](https://github.com/scalameta/metals-vscode/pull/39) Merge pull request
  #39 from gabro/new-config-params (@gabro)
- [5eaadcd](https://github.com/scalameta/metals-vscode/commit/5eaadcd2993b6fe3d0596c78f18f472096f6ce97)
  Update vsce (@gabro)
- [ffdeccb](https://github.com/scalameta/metals-vscode/commit/ffdeccbdc0aa99c4ef00b7c37949b1db3320eea3)
  Add scalafmtConfigPath option (@gabro)
- [#38](https://github.com/scalameta/metals-vscode/pull/38) Merge pull request
  #38 from gabro/prefer-jdk (@gabro)
- [38f42be](https://github.com/scalameta/metals-vscode/commit/38f42be46bcbd848309ba23487800bf94c72aed9)
  Prefer JDK over JRE (@gabro)
- [3e793ca](https://github.com/scalameta/metals-vscode/commit/3e793cacb2a4220f2aaab73e4f0f4761a0db441d)
  v1.1.3

### v1.1.3 (2018/12/14 22:05 +00:00)

- [#36](https://github.com/scalameta/metals-vscode/pull/36) Merge pull request
  #36 from olafurpg/master (@olafurpg)
- [8435883](https://github.com/scalameta/metals-vscode/commit/84358833ccae6a5af7720ef2ea2bff234e39f15b)
  Synchronize readme with latest website (@olafurpg)
- [0cb3136](https://github.com/scalameta/metals-vscode/commit/0cb31361b5bbe36417e2c24481fc0cf5b85c0be9)
  1.1.2 (@olafurpg)
- [babbd18](https://github.com/scalameta/metals-vscode/commit/babbd18a556a897bd7825be904685993b8d28c1f)
  1.1.1 (@olafurpg)

### v1.1.1 (2018/12/14 19:12 +00:00)

- [13e9531](https://github.com/scalameta/metals-vscode/commit/13e95313d89867e5a1e5108412a0279eef97be1e)
  Upgrade to v0.3.3 (@olafurpg)
- [195f83d](https://github.com/scalameta/metals-vscode/commit/195f83ddf7142b5a4acb1d626b58d0b4b4c7a66a)
  v1.1.0

### v1.1.0 (2018/12/14 14:43 +00:00)

- [#34](https://github.com/scalameta/metals-vscode/pull/34) Merge pull request
  #34 from gabro/032 (@gabro)
- [#35](https://github.com/scalameta/metals-vscode/pull/35) Merge pull request
  #35 from gabro/remove-sbt-config (@gabro)
- [efe19ab](https://github.com/scalameta/metals-vscode/commit/efe19ab4291e24da845f9607ef9b78db14e1ed47)
  Update sbtScript description as per review (@gabro)
- [56e500b](https://github.com/scalameta/metals-vscode/commit/56e500b19da7369ac8850d9c11dc7e8d3d33afa5)
  Remove sbtLauncher and sbtOptions options (see scalameta/metals#410) (@gabro)
- [596b8eb](https://github.com/scalameta/metals-vscode/commit/596b8ebfc9d157e3354b95f0ac54ab8028a8426f)
  Bump default serverVersion to 0.3.2 (@gabro)
- [#33](https://github.com/scalameta/metals-vscode/pull/33) Merge pull request
  #33 from gabro/java-home-improvements (@gabro)
- [30bf8bb](https://github.com/scalameta/metals-vscode/commit/30bf8bb9115be678d2324470fa5e96253de3c3f2)
  Improve error message (@gabro)
- [9d7beb1](https://github.com/scalameta/metals-vscode/commit/9d7beb1a30cac644487857548ea8cab0bf9a8bc0)
  Handle empty javaHomes array (@gabro)
- [224b1e8](https://github.com/scalameta/metals-vscode/commit/224b1e865f0345b848703c92d13a6901e1ba6e68)
  Replace find-java-home with locate-java-home (@gabro)
- [1fd4b18](https://github.com/scalameta/metals-vscode/commit/1fd4b18bbb7dca736ce4a8431c4d3075ea60e671)
  Add find-java-home typings (@gabro)
- [5166ebc](https://github.com/scalameta/metals-vscode/commit/5166ebc1e86cebbafd71d2a268ce1321c4586409)
  Show full error to the output (@gabro)
- [1c6df4e](https://github.com/scalameta/metals-vscode/commit/1c6df4ebc871e10ba7f534cde0fe9f4c1a2c1f7d)
  Extract getJavaHome utility (@gabro)
- [#31](https://github.com/scalameta/metals-vscode/pull/31) Merge pull request
  #31 from gabro/scoped-commands (@gabro)
- [53208c6](https://github.com/scalameta/metals-vscode/commit/53208c6044132190b13f1b5b7ea104807d3adf06)
  Show Metals commands only when the active buffer is a Scala file (@gabro)
- [#29](https://github.com/scalameta/metals-vscode/pull/29) Merge pull request
  #29 from olafurpg/ttl (@olafurpg)
- [41e5d9b](https://github.com/scalameta/metals-vscode/commit/41e5d9bb5468885460d116783411cfc49bd4bfd1)
  Use infinite ttl for coursier fetch (@olafurpg)
- [#28](https://github.com/scalameta/metals-vscode/pull/28) Merge pull request
  #28 from gabro/outdated-warning (@gabro)
- [#27](https://github.com/scalameta/metals-vscode/pull/27) Merge pull request
  #27 from olafurpg/stdout (@olafurpg)
- [7a4d778](https://github.com/scalameta/metals-vscode/commit/7a4d7782a89861665bc279c056cb519b6280b8c8)
  Handle exceptions thrown by semver (@gabro)
- [24c0797](https://github.com/scalameta/metals-vscode/commit/24c079727faaefbd74a510beb25a213b9d651ab0)
  Don't pre-maturely trim stdout (@olafurpg)
- [342c23e](https://github.com/scalameta/metals-vscode/commit/342c23ee7a23582fcd90809e518b3152f5103a26)
  Fix #24, print stdout in case download failed (@olafurpg)
- [#25](https://github.com/scalameta/metals-vscode/pull/25) Merge pull request
  #25 from olafurpg/readme (@olafurpg)
- [#26](https://github.com/scalameta/metals-vscode/pull/26) Merge pull request
  #26 from gabro/outdated-warning (@gabro)
- [2abb31b](https://github.com/scalameta/metals-vscode/commit/2abb31b790d3b8b318b57f5d09cd5f352ab0dfb4)
  Warn on out-of-date server versions (@gabro)
- [00b866e](https://github.com/scalameta/metals-vscode/commit/00b866e08bb60c45cc0dd2746521862ed4ab5e29)
  Synchronize readme with website (@olafurpg)
- [#22](https://github.com/scalameta/metals-vscode/pull/22) Merge pull request
  #22 from gabro/issues (@gabro)
- [#21](https://github.com/scalameta/metals-vscode/pull/21) Merge pull request
  #21 from olafurpg/config (@olafurpg)
- [7e1f5a2](https://github.com/scalameta/metals-vscode/commit/7e1f5a2275c67fa4c64f056c66783cefa0f34c84)
  Adjust issues URLs (@gabro)
- [c464ecd](https://github.com/scalameta/metals-vscode/commit/c464ecd5013771759cd2bfc8a64a6f6f7a0b14c5)
  Use camel case instead of kebab for more readable settings UI (@olafurpg)
- [d7cdb88](https://github.com/scalameta/metals-vscode/commit/d7cdb88acda597e4d5f9bddb7bd67d3f97607749)
  Add new configuration options (@olafurpg)
- [7969642](https://github.com/scalameta/metals-vscode/commit/7969642212be207805825f9d10ed6d76fee33453)
  v1.0.0

### v1.0.0 (2018/12/07 16:00 +00:00)

- [#20](https://github.com/scalameta/metals-vscode/pull/20) Merge pull request
  #20 from olafurpg/master (@olafurpg)
- [9b2dac1](https://github.com/scalameta/metals-vscode/commit/9b2dac1b218682ad45e3548e72ffa6ebcc575f53)
  Update supported Scala versions (@olafurpg)
- [43ef17d](https://github.com/scalameta/metals-vscode/commit/43ef17d3a347818da42b482f1ec20108dd411b23)
  v0.3.3
