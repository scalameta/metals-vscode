/**
 * These are some of the common user configuration options used in Metals and needed for the editors.
 *
 *  - https://scalameta.org/metals/docs/integrations/new-editor#metals-user-configuration
 */
export enum UserConfiguration {
  /**
   * Metals server version
   */
  ServerVersion = "serverVersion",
  /**
   * Metals server Java properties
   */
  ServerProperties = "serverProperties",
  /**
   * Directory containing the Java binary.
   */
  JavaHome = "javaHome",
  /**
   * Additional repositories that can be used to download dependencies.
   * https://get-coursier.io/docs/other-repositories
   */
  CustomRepositories = "customRepositories",
  /**
   * Repository to use instead of maven central for example `https://jcenter.bintray.com`
   */
  CoursierMirror = "coursierMirror",
}
