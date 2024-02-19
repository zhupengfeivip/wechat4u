// prettier.config.js or .prettierrc.js
module.exports = {
    trailingComma: 'es5',
    // 条件允许时每行字符长度大于该值时进行换行（prettier不会强行换行：比如将一个引号包裹的字符串折行）。默认为80
    printWidth: 120,
    // 缩进空格数；默认为2
    tabWidth: 2,
    // 语句末尾是否带分号
    semi: false,
    // 是否将双引号转换为单引号。双引号里包含单引号时不会被格式化
    singleQuote: true,
}
