/**
 * Created by ygintsyak on 20.04.16.
 */
module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: {
            test: './test_reports'
        },
        nodeunit: {
            all: ['test/*.js'],
            options: {
                reporter: 'junit',
                reporterOptions: {
                    output: 'test_reports'
                }
            }
        }
    });


    grunt.loadNpmTasks('grunt-contrib-nodeunit');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.registerTask('test', ['nodeunit']);
    grunt.registerTask('cleanup', ['clean']);
};