const webpackMerge = require("webpack-merge");
const base = require("./webpack.base");

module.exports = function () {
    return webpackMerge.merge(base.config, {
        mode: "development",
        output: {
            filename: "[name]-dev.js",
            library: {
                name: "orda_jsoneditor",
                type: "umd"
            },
            globalObject: "this",
            publicPath: "/"
        },
        devtool: "source-map",
        devServer: {
            static: {
                directory: base.root('example'),
                watch: true,
                serveIndex: true,
            },
            watchFiles: [base.root('example/**/*')],
        },
    });
};
