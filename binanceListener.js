var HTMLParser = require("fast-html-parser");
var fetch = require("node-fetch");
const nodemailer = require('nodemailer');

emails = [
    "tobi418@gmail.com"
];

var newNewsList = [];
var currentNewsList = [];
fetchHTML();

setInterval(function(){
    fetchHTML();
},60000);


function fetchHTML(){
    fetch('https://support.binance.com/hc/en-us/sections/115000106672-New-Listings').then(res => res.text()).then(body =>{
    //fetch('http://localhost:8000/test.html').then(res => res.text()).then(body =>{
        parsed = HTMLParser.parse(body);
        //console.log(parsed.querySelector('.article-list').childNodes.length);
        extractNews(parsed.querySelector('.article-list').childNodes);
    });
}
function extractNews(newsObjects){
    tempList = [];
    newNewsList = [];
    newsObjects.forEach(element => {
        if(element.childNodes != undefined){
            tempList.push(element.childNodes);
        }
    });
    tempList.forEach(element => {
        let rawLink = element[1].rawAttrs;
        let link = rawLink.substring(rawLink.indexOf('"')+1, rawLink.lastIndexOf('"'));
        newNewsList.push({title:element[1].childNodes[0].rawText, link:link});
    });
    if(currentNewsList.length > 0){
        if(newNewsList[0].title != currentNewsList[0].title){
            currentNewsList = newNewsList;
            console.log("new listing!!!");
            getMarkets(newNewsList[0].title).then(markets=>{
                let marketsMessage = "";
                if(markets.markets.length > 0){
                    markets.markets.forEach(el=>{
                        marketsMessage = marketsMessage+el+'<br>';
                    });
                    send_mail(emails, newNewsList[0].title, newNewsList[0].link ,markets.coinName,marketsMessage).then(mailRes=>{
                        console.log("email sent");
                    })
                } else {
                    send_mail(emails, newNewsList[0].title, newNewsList[0].link,'no coin','no markets').then(mailRes=>{
                        console.log("email sent");
                    })
                }
            }).catch(err=>{
                send_mail(emails, newNewsList[0].title,newNewsList[0].link,'no coin','no markets').then(mailRes=>{
                    console.log("email sent");
                })
            })
        } else {
            console.log("no new listing");
        }
    } else {
        console.log("listings fetched");
        currentNewsList = newNewsList;
    }
    console.log("Latest Listing: ",currentNewsList[0].title);
}

function getMarkets(newsTitle){
    let titleWords = newsTitle.split(" ");
    let coinName = null;
    let markets = [];
    return new Promise((resolve,reject)=>{
        titleWords.forEach((el,i)=>{
            if(el.toLowerCase() == "lists"){
                coinName = titleWords[i+1];
            }
        });
        if(coinName!=null){
            fetch('https://coinmarketcap.com/currencies/'+coinName).then(res => res.text()).then(body =>{
                let parsed = HTMLParser.parse(body);
                let errorPage = parsed.querySelector('.title-404');
                let tempMarketList = parsed.querySelector('#markets-table').childNodes[3].childNodes;
                if(errorPage == null){
                    tempMarketList.forEach(el=>{
                        if(el.childNodes != undefined){
                            let rawMarketName = el.childNodes[3].rawAttrs;
                            markets.push(rawMarketName.substring(rawMarketName.indexOf('"')+1,rawMarketName.lastIndexOf('"')));
                        }
                    });
                    resolve({markets:Array.from(new Set(markets)), coinName:coinName});
                } else {
                    resolve({markets:[],coinName:'No Coin'});
                }
            }).catch(err=>{
                reject(err);
            });
        } else {
            resolve({markets:[],coinName:'No Coin'});
        }
    })
}


var send_mail = function(to, newsTitle , link , coinName='', markets='', attachment){
    transporter = nodemailer.createTransport({
    host: 'smtp.sparkpostmail.com',
    port: 587,
    secure: false, // use TLS
    auth: {
        user: 'SMTP_Injection',
        pass: 'password'
    },
    tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false
    }
});

// setup email data with unicode symbols
    mailOptions = {
    from: '"INJAAN 👻" <info@injaan.ml>', // sender address
    to: to, // list of receivers
    subject: 'Binance listings', // Subject line
    //text: text, // plain text body
    html: '<b>News Title:</b> <a href="https://support.binance.com'+link+'">'+newsTitle+'</a><br><b>Coin Name: </b>'+coinName+'<br><b>Markets: </b><br>'+markets, // html body
    /*attachments:[{   // utf-8 string as an attachment
        filename: attachment,
        path: path.join(__dirname, './'+attachment)
    }]
    */
    };

    // send mail with defined transport object
    return new Promise(function(resolve, reject){
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            reject("error")
        }
        //console.log('Message %s sent: %s', info.messageId, info.response);
        resolve("done")
      });
    })
  }