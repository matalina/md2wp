const RSS = require('rss-generator');
const fs = require('fs');
const moment = require('moment');
const timestamp = 'ddd, DD MMM YYYY HH:mm:ss ZZ';
const inquirer = require('inquirer');
const slugify = require('slugify');


inquirer
  .prompt([
    {
      type: 'input',
      name: 'path',
      message: 'Where are the files located?',
      default: './scenes',
    },
    {
      type: 'input',
      name: 'start',
      message: 'What date would you like to start posting? (YYYY-MM-DD)',
      default: moment().add(1,'days').format('YYYY-MM-DD'),
    },
    {
      type: 'number',
      name: 'frequency',
      message: 'How many days a part would you like to make each post?',
      default: 1,
    },
    {
      type: 'input',
      name: 'time',
      message: 'At what time would you like to post at? (HH:MM) 24 hour time',
      default: '06:00',
    },
    {
      type: 'input',
      name: 'category',
      message: 'What category(s) would you like to post to? (separate categories by a comma)',
      default: 'Serial',
    },
    {
      type: 'input',
      name: 'tags',
      message: 'What tagss would you like to post to? (separate tags by a comma)',
      default: 'Write Every Day',
    }
  ])
  .then(answers => {
    // Use user feedback for... whatever!!
    createImportFile(answers);
  });


function createImportFile(answers) {
  let feed = new RSS({
    title: 'From Scene Importer',
    description: 'a script to import all scenes to wordpress',
    site_url: 'http://akddev.net',
    pubDate: moment().format(timestamp),
    custom_namespaces: {
      excerpt: "http://wordpress.org/export/1.2/excerpt/",
    	content: "http://purl.org/rss/1.0/modules/content/",
    	wfw: "http://wellformedweb.org/CommentAPI/",
    	dc: "http://purl.org/dc/elements/1.1/",
    	wp: "http://wordpress.org/export/1.2/",
    },
    custom_elements: [
      {'wp:wxr_version': 1.2},
      {'wp:author': [
        {'wp:author_display_name': 'Guest'}
      ]}
    ]
  });

  let path = answers.path;
  let start = moment(answers.start + ' ' + answers.time, 'YYYY-MM-DD HH:mm');
  let offset = start.utcOffset();
  let days = answers.frequency;
  let category = answers.category.split(',');
  let tags_in = answers.tags.split(',');

  let categories = [];
  for(let i in category) {
    let cat = category[i];
    categories.push({
      'category': [
        { _attr: {
          domain: 'category',
          nicename: slugify(cat).toLowerCase(),
        }},
        cat
      ]
    });
  }

  let tags = [];
  for(let i in tags_in) {
    let tag = tags_in[i];
    tags.push({
      'category': [
        { _attr: {
          domain: 'post_tag',
          nicename: slugify(tag).toLowerCase(),
        }},
        tag
      ]
    });
  }

  fs.readdir(path, (err, items) => {
      for (var i=0; i<items.length; i++) {
        let item = items[i];
        let parts = item.split('.');
        let file = path + '/' + item;

        if(parts[parts.length - 1] === 'md') {
          let contents = fs.readFileSync(file, 'utf8');
          let lines = contents.trim().split(/[\n]+/);

          let title = lines.shift().replace('# ','');
          let content = lines.join("\n").trim();

          feed.item({
            title,
            date: start.format(timestamp),
            description: content,
            author: 'Guest',
            custom_elements: [
              {'content:encoded': { _cdata: content }},
              {'wp:status': 'future'},
              {'wp:post_type': 'post'},
              {'wp:postmeta': [
          			{'wp:meta_key': '_wpcom_is_markdown'},
          			{'wp:meta_value': {_cdata: 1}},
              ]},
              {'wp:post_date': start.format('YYYY-MM-DD HH:mm:ss')},
              {'wp:post_date_gmt': start.utc().format('YYYY-MM-DD HH:mm:ss')},
              ...categories,
              ...tags
            ],
          });
          start.utcOffset(offset).add(days, 'days');
        }
      }

      let xml = feed.xml({indent: true});

      fs.writeFile('import.xml',xml, (err) => {
        if (err){
          console.log(err);
        }
        else {
          console.log("Successfully Written to File.");
        }
      })

  });
}
