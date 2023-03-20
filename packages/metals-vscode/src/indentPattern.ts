export function increaseIndentPattern(): RegExp {
  const old_if = /\b(if|while)\s+\([^\)]*?\)/;
  const keywords_not_ending = /((?<!\bend\b\s*?)\b(if|while|for|match|try))/;

  const keywords =
    /(\b(then|else|do|catch|finally|yield|return|throw))|=|=>|<-|=>>|:/;
  const ending_spaces = /\s*?$/;
  const extensionClause = /\s*extension\s*((\(|\[).*(\)|\]))+/;

  const regexp = `(${extensionClause.source}|${keywords_not_ending.source}|${old_if.source}|${keywords.source})${ending_spaces.source}`;
  return new RegExp(regexp);
}
