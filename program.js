import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-firestore.js";
import { firebaseConfig } from './environment.js';

const app = initializeApp(firebaseConfig);    
const db = getFirestore();
const datas = [];
var d1 = new Date();
var Ip = [];

const onGetTasks = (callback) =>
    onSnapshot(collection(db, "visits"), callback);

var xhr = new XMLHttpRequest();
xhr.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        var response_loc = JSON.parse(this.responseText);
        console.log("request : " + response_loc);
        if(response_loc.status == "success") {
            save(response.ip, response_loc.country, response_loc.regionName);
        }
    }
};
   
function get() {

$.getJSON("https://api.ipify.org/?format=json", function(e) {
    Ip.push(e.ip);

var endpoint = 'https://ip-api.com/batch?fields=status,country,countryCode,regionName';

var xhr = new XMLHttpRequest();
xhr.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        var response = JSON.parse(this.responseText);
        if(response[0].status == "success"){

        }
        save(e.ip, response[0].country, response[0].regionName, response[0].countryCode);
    }
};
var data = JSON.stringify(Ip);
console.log("sending:", data);

xhr.open('POST', endpoint, true);
xhr.send(data);
});
};


async function save (query, country, city, country_code) {
    try {
        await setDoc(doc(db, "visits", query), {
            city: city,
            country: country,
            country_code: country_code,
            date: d1.toUTCString()
        });
        
    }
    catch (e) {
        console.error("Error adding document: ", e);
    }
    console.log("ok");
}

function close_all() {
    // $("#java_p").hide();
    $("#opengl_p").hide();
    $("#embedded_p").hide();
    $("#shell_p").hide();
    $("#common_p").hide();
    $("#teaching_p").hide();
    $("#cpp_modules_p").hide();
    $("#array_and_hashing_p").hide();
    $("#backtracking_p").hide();
    $("#welcome_p").hide();
    $("#binary_search_p").hide();
};

$(document).ready(function () {
// window.addEventListener("DOMContentLoaded", async (e) => {
    window.addEventListener('resize', () => {
    refresh();
    })

    $(document).scroll(function()  {
    $("#content").css("visibility", "hidden");
    });

    var elem = document.getElementById('project_badge_id');

    elem.onmouseover = function() {
        document.getElementById("project_badge_id").classList.add('bg-special-empty');
        document.getElementById("project_badge_id").classList.remove('bg-special-blue');
        $("#content").css("visibility","visible");
        $('#content').css('margin-top', ($("#project_badge_id").offset().top - $(window).scrollTop()).toString() + "px");
        $('#content').css('margin-left', ($("#project_badge_id").offset().left + 300).toString() + "px");
        deneme.innerHTML = ``;
        deneme.innerHTML += `This badge shows my non-commerical projects. There are much more my previous assignments and personel projects.`;
    }


    elem.onmouseout = function() {
        $("#content").css("visibility", "hidden");
        document.getElementById("project_badge_id").classList.add('bg-special-blue');
        document.getElementById("project_badge_id").classList.remove('bg-special-empty');
    }

    elem = document.getElementById('42_istanbul_badge_id'); 
    elem.onmouseover = function() {
        document.getElementById("42_istanbul_badge_id").classList.add('bg-special-empty');
        document.getElementById("42_istanbul_badge_id").classList.remove('bg-special-blue');
        $("#content").css("visibility","visible");
        $('#content').css('margin-top', ($("#42_istanbul_badge_id").offset().top - $(window).scrollTop()).toString() + "px");
        $('#content').css('margin-left', ($("#42_istanbul_badge_id").offset().left + 300).toString() + "px");
        deneme.innerHTML = ``;
        deneme.innerHTML += `<p> 42 Istanbul is part of 42 Network <br/> inception(Docker) <br/> ft_containers(map, stack, vector re-implement) <br/> cub3d & FdF(ray casting) <br/> fd_irc (C++ Socket) <br/> minishell (re-implement a part of bash) <br/> shell(bash fundamentals) <br/> C++ Modules(C++ Fundamentals)) </p>`;
    }

    elem.onmouseout = function() {
        $("#content").css("visibility", "hidden");
        document.getElementById("42_istanbul_badge_id").classList.add('bg-special-blue');
        document.getElementById("42_istanbul_badge_id").classList.remove('bg-special-empty');
    }

    elem = document.getElementById('tutorial_badge_id');

    elem.onmouseover = function() {
        document.getElementById("tutorial_badge_id").classList.add('bg-special-empty');
        document.getElementById("tutorial_badge_id").classList.remove('bg-special-blue');
        $("#content").css("visibility","visible");
        $('#content').css('margin-top', ($("#tutorial_badge_id").offset().top - $(window).scrollTop()).toString() + "px");
        $('#content').css('margin-left', ($("#tutorial_badge_id").offset().left + 300).toString() + "px");
        deneme.innerHTML = ``;
        deneme.innerHTML += `Notes about these technologies writte in markdown. Some important commands and explanations.`;
    }

    elem.onmouseout = function() {
        $("#content").css("visibility", "hidden");
        document.getElementById("tutorial_badge_id").classList.add('bg-special-blue');
        document.getElementById("tutorial_badge_id").classList.remove('bg-special-empty');
    }


    close_all();
    $("#welcome_p").show();
    $("button").click(function () {
        switch (this.id) {
            //case "java_b": close_all(); $("#java_p").show(); break;
            case "opengl_b": close_all(); $("#opengl_p").show(); break;
            case "embedded_b": close_all(); $("#embedded_p").show(); break;
            case "shell_b": close_all(); $("#shell_p").show(); break;
            case "common_b": close_all(); $("#common_p").show(); break;

            case "teaching_b": close_all(); $("#teaching_p").show(); break;
            case "cpp_modules_b": close_all(); $("#cpp_modules_p").show(); break;
            case "array_and_hashing_b": close_all(); $("#array_and_hashing_p").show(); break;
            case "backtracking_b": close_all(); $("#backtracking_p").show(); break;
            case "binary_search_b": close_all(); $("#binary_search_p").show(); break;
        }
    });


    get();
    visitscontainer.innerHTML = `<br/>
    <br/>
    <br/>
    <h5> <span style="color:white;font:Fira Code"> Visitors from (based on ip) </span> </h5>
    `;

    let obj = {};

    let flag = 1;

    const querySnapshot = getDocs(collection(db, "visits"))
    .then(querySnapshot => {
    querySnapshot.forEach((doc) => {
    const get_data = doc.data();

    for (var j = 0; j < datas.length; j++){
        const from_db = get_data.country_code + "," + get_data.city;
        if(datas[j].data == from_db) {
            datas[j].count++;
            flag = 0;
            break ;
        }
    }

    if(flag) {
    obj["data"] = get_data.country_code + "," + get_data.city;
    obj["count"] = 1
    datas.push(obj); 
    obj = {};
    }
    flag=1;

    }); //foreach


    for (var j = 0; j < datas.length; j++){
        var nameArr = datas[j].data.split(',');
        visitscontainer.innerHTML += `
        <div class="card text-white bg-special1" style="width: 20rem;height: 3rem;">
        <div class="card-body ">
        <div class="row">
        <div class="col"><h6> <p class="text-left"> <span class="fi fi-${nameArr[0].toLowerCase()}"></span>  ${nameArr[1]}  </p></h6></div>
        <div class="col"> <h6><p class="text-end"> <i class="bi bi-person"></i> ${datas[j].count}</p></h6></div>
        </div>
        </div>
        </div>`
    }
    }); //then
}); //end of ready function
