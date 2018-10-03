
var host = `http://18.191.160.243:3003`;//`http://18.191.160.243:3003`;    
var awsCredentials = new AWS.Credentials();
var settings = {
    awsCredentials: awsCredentials,
    awsRegion: "us-east-2",
    pollyVoiceId: "Lotte",//Ruben//Lotte//"Justin":English,"Ruben":Dutch
    cacheSpeech: true
};
var manualLocalCache = [];

function ChattyKathy(settings) {

    settings = getValidatedSettings(settings);

    // Add audio node to html
    var elementId = "audioElement" + new Date().valueOf().toString();
    var audioElement = document.createElement('audio');
    audioElement.setAttribute("id", elementId);
    document.body.appendChild(audioElement);

    var isSpeaking = false;

    AWS.config.credentials = settings.awsCredentials;
    AWS.config.region = settings.awsRegion;

    var kathy = {
        self: this,
        playlist:[],
        // Speak
        Speak: function (msg) {
            if (isSpeaking) {

                this.playlist.push(msg);
                console.log("isSpeaking", JSON.stringify(this.playlist));
            } else {
                say(msg).then(sayNext)
            }
        },
        prepareAudio: function (msg) {
            getAudio(msg);
        },
        isSpeaking(){
            return isSpeaking;
        },
        Pause: function(){
            pause();
        },        
        Resume: function(){
            resume();
        },

        // Quit speaking, clear playlist
        ShutUp: function(){
            shutUp();
            document.body.removeChild(audioElement);
        },
        // Speak & return promise
        SpeakWithPromise: function (msg) {
            return say(msg);
        },

        IsSpeaking: function () {
            return isSpeaking;
        },

        ForgetCachedSpeech: function () {
            localStorage.removeItem("chattyKathyDictionary");
        }

    }

    function pause() {
        audioElement.pause();
    }
    function resume() {
        audioElement.play();
    }
    // Quit talking
    function shutUp() {
        isSpeaking = false;
        audioElement.pause();
        playlist = [];
    }

    // Speak the message
    function say(message) {
        return new Promise(function (successCallback, errorCallback) {
            isSpeaking = true;
            getAudio(message.text)
                .then(playAudio)
                .then(function(){
                    $(".audio-events").trigger("reading:finish", [message.idx, message.ci]);
                    successCallback();
                });
        });
    }

    // Say next
    function sayNext() {
        var list = kathy.playlist;
        if (list.length > 0) {
       //     console.log("sayNext", JSON.stringify(list));
            var msg = list[0];
            list.splice(0, 1);
            say(msg).then(sayNext);
        }
    }

    // Get Audio
    function getAudio(message) {
        if (settings.cacheSpeech === false || requestSpeechFromLocalCache(message) === null) {
            return requestSpeechFromAWS(message);
        } else {
            return requestSpeechFromLocalCache(message);
        }
    }

    // Make request to Amazon polly
    function requestSpeechFromAWS(message) {
        return new Promise(function (successCallback, errorCallback) {
            var polly = new AWS.Polly();
            var params = {
                OutputFormat: 'mp3',
                TextType: 'ssml',
                Text: message,
                VoiceId: settings.pollyVoiceId
            }
            polly.synthesizeSpeech(params, function (error, data) {
                if (error) {
                    errorCallback(error)
                } else {
                    saveSpeechToLocalCache(message, data.AudioStream);
                    successCallback(data.AudioStream);
                }
            });
        });
    }

    // Save to local cache
    function saveSpeechToLocalCache(message, audioStream) {
        var record = {
            Message: message,
            AudioStream: JSON.stringify(audioStream)
        };
        var localPlaylist = JSON.parse(localStorage.getItem("chattyKathyDictionary"));

        if (localPlaylist === null) {
            localPlaylist = [];
            localPlaylist.push(record);
        }else{
            localPlaylist.push(record);
        }
        manualLocalCache.push(record);
        localStorage.setItem("chattyKathyDictionary", JSON.stringify(localPlaylist));
    }

    // Check local cache for audio clip
    function requestSpeechFromLocalCache(message) {
        var audioStreamFromManual = manualLocalCache.filter(function (record) {
            return record.Message === message;
        })[0];
        if (audioStreamFromManual != null &&  typeof audioStreamFromManual !== 'undefined'){
            return new Promise(function (successCallback, errorCallback) {
                successCallback(JSON.parse(audioStreamFromManual.AudioStream).data);
            });            
        }
        var audioDictionary = localStorage.getItem("chattyKathyDictionary");
        if (audioDictionary === null) {
            return null;
        }
        var audioStreamArray = JSON.parse(audioDictionary);
        var audioStream = audioStreamArray.filter(function (record) {
            return record.Message === message;
        })[0];;
       
        if (audioStream === null || typeof audioStream === 'undefined') {
            return null;
        } else {
            return new Promise(function (successCallback, errorCallback) {
                successCallback(JSON.parse(audioStream.AudioStream).data);
            });
        }
    }

    // Play audio
    function playAudio(audioStream) {
        return new Promise(function (success, error) {
            console.log("playAudio hihihih", isSpeaking);
            if (!isSpeaking) return;
  
            var uInt8Array = new Uint8Array(audioStream);
            var arrayBuffer = uInt8Array.buffer;
            var blob = new Blob([arrayBuffer]);

            var url = URL.createObjectURL(blob);
            audioElement.src = url;
            audioElement.addEventListener("ended", function () {
                isSpeaking = false;
                success();
            });
            audioElement.play();        
            if (!playPauseBtn.hasClass("playing"))  {
                audioElement.pause();
            }
        });
    }

    // Validate settings
    function getValidatedSettings(settings) {
        if (typeof settings === 'undefined') {
            throw "Settings must be provided to ChattyKathy's constructor";
        }
        if (typeof settings.awsCredentials === 'undefined') {
            throw "A valid AWS Credentials object must be provided";
        }
        if (typeof settings.awsRegion === 'undefined' || settings.awsRegion.length < 1) {
            throw "A valid AWS Region must be provided";
        }
        if (typeof settings.pollyVoiceId === 'undefined') {
            settings.pollyVoiceId = "Amy";
        }
        if (typeof settings.cacheSpeech === 'undefined') {
            settings.cacheSpeech === true;
        }
        return settings;
    }

    return kathy;
}    

var kathy = ChattyKathy(settings);
    $(`html`).append(
        `<div class="smicon">
            <div class="smicon-hover hidden explore-expand-string">
                Explore your accessibility options.
            </div>
            <div class="smicon-right">    
                <svg 
                    class="smicon-hover hidden" width="32" height="32" viewBox="0 0 32 32" 
                    style="transform: scale(0.5, 0.5); margin-bottom: 10px;">
                    <g transform="scale(0.03125 0.03125)"><path d="M1009.996 828.976l-301.544-301.544c-18.668-18.668-49.214-18.668-67.882 0l-22.626 22.626-184-184 302.056-302.058h-320l-142.058 142.058-14.060-14.058h-67.882v67.882l14.058 14.058-206.058 206.060 160 160 206.058-206.058 184 184-22.626 22.626c-18.668 18.668-18.668 49.214 0 67.882l301.544 301.544c18.668 18.668 49.214 18.668 67.882 0l113.136-113.136c18.67-18.666 18.67-49.214 0.002-67.882z"></path></g>
                </svg>
                <svg 
                    width="32" height="32" viewBox="0 0 32 32">
                    <g transform="scale(0.03125 0.03125)"><path d="M512 192c-223.318 0-416.882 130.042-512 320 95.118 189.958 288.682 320 512 320 223.312 0 416.876-130.042 512-320-95.116-189.958-288.688-320-512-320zM764.45 361.704c60.162 38.374 111.142 89.774 149.434 150.296-38.292 60.522-89.274 111.922-149.436 150.296-75.594 48.218-162.89 73.704-252.448 73.704-89.56 0-176.858-25.486-252.452-73.704-60.158-38.372-111.138-89.772-149.432-150.296 38.292-60.524 89.274-111.924 149.434-150.296 3.918-2.5 7.876-4.922 11.86-7.3-9.96 27.328-15.41 56.822-15.41 87.596 0 141.382 114.616 256 256 256 141.382 0 256-114.618 256-256 0-30.774-5.452-60.268-15.408-87.598 3.978 2.378 7.938 4.802 11.858 7.302v0zM512 416c0 53.020-42.98 96-96 96s-96-42.98-96-96 42.98-96 96-96 96 42.982 96 96z"></path></g>
                </svg>
            </div>
        </div>
        <div class="project-add-on hidden">
            <div class="audio-events"> </div>
            <div class="reader-bottom-bar hidden">
                <div class="zoom-bar">
                    <div class="tooltip1" title="Zoom Out">
                        <div id="zmout-btn"><img src="${host}/images/zoom-out.svg"></div>
                    </div>
                    <div class="tooltip1" title="Reset Zoom">
                        <div id="refresh-btn" ><img src="${host}/images/refresh.svg" class="wdh24x24"></div>
                    </div>
                    <div class="tooltip1" title="Zoom In">
                        <div id="zmin-btn"><img src="${host}/images/zoom-in.svg"></div>
                    </div>
                </div>
                <div class="font-bar">
                    <div class="tooltip1" title="Previous Font">
                        <div id="font-prev-btn"><img src="${host}/images/left-arrow.svg"></div>
                    </div>
                    <div class="tooltip1" title="Reset Font">
                        <div id="font-btn"><span style="width:30px;height:30px;">Aa</span></div>
                    </div>
                    <div class="tooltip1" title="Next Font">
                        <div id="font-next-btn"><img src="${host}/images/right-arrow.svg"></div>
                    </div>
                </div>
                <div class="contrast-bar">
                    <div class="tooltip1" title="Previous Contrast">
                        <div id="contrast-prev-btn"><img src="${host}/images/left-arrow.svg"></div>
                    </div>
                    <div class="tooltip1" title="Reset Contrast">
                        <div id="contrast-btn"><img src="${host}/images/contrast.svg" class="wdh24x24"></div>
                    </div>
                    <div class="tooltip1" title="Next Contrast">
                        <div id="contrast-next-btn"><img src="${host}/images/right-arrow.svg"></div>
                    </div>
                </div>
                <div class="reader-bar-close-btn">&times;</div>
            </div>
            
            <div class="player-bottom-bar hidden">
                <div class="play-bar">
                    <div class="tooltip1" title="Move to Previous">
                        <div id="mvprv-btn"><img src="${host}/images/back.svg" class="wdh24x24"></div>
                    </div>
                    <canvas id="play-status-canvas" 
                                width="45px" height="45px" title="Play or Pause"></canvas>
                    
                    <div class="tooltip1" title="Move to Next">
                        <div id="mvnxt-btn"><img src="${host}/images/next.svg" class="wdh24x24"></div>
                    </div>

                </div>
                <div class="play-speed-bar">
                    <div class="tooltip1" title="Decrease Speed">
                        <div id="play-speed-decrease-btn"><span style="width:30px;height:30px;">&nbsp;&minus;</span></div>
                    </div>
                    <div class="tooltip1" title="Reset Speed">
                        <div id="play-speed-reset-btn"><span style="width:30px;height:30px;">1.0x</span></div>
                    </div>
                    <div class="tooltip1" title="Increase Speed">
                        <div id="play-speed-increase-btn"><span style="width:30px;height:30px;">&plus;&nbsp;</span></div>
                    </div>
                </div>
                <div class="player-bar-close-btn">&times;</div>
            </div>

            <div id="helpdesk-panel" class="hidden">
                <div class="helpdsk-close-btn">&times;</div>
                <div>
                    <div class="">
                        <h2>Help Desk</h2>
                    </div>
                    <div class="helpdsk-content" tab="1">
                        <div class="form-action-intr">
                            <div class="form-action-title">
                                This form will be submitted to Andrew.
                            </div>
                            <p class="form-action-description">Andrew helps ensure full access to web content but is not responsible for the creation or management of this site.</p>
                        </div>
                        <p>The Help Desk allows site visitors that have disabilities and/or may use assistive technologies to report accessibility or usability issues experienced on this website.</p>
                        <form id="helpdesk_form" action="" method="post">
                            <fieldset>
                                <p id="isATUsed-title">
                                    Do you use any Assistive Technology?
                                </p>
                                <div role="radiogroup">
                                    <label for="isATUsed_yes"><input type="radio" name="isATUsed" id="isATUsed_yes" value="yes">&nbsp;&nbsp;Yes</label>
                                    <label for="isATUsed_no"><input type="radio" name="isATUsed" id="isATUsed_no" value="no">&nbsp;&nbsp;No</label>
                                </div>
                            </fieldset>
                            <div>
                                <label for="Description">Feedback <span>(required)</span></label>
                                <textarea name="Description" id="Description" required=""></textarea>
                            </div>
                            <div>
                                <label for="Name">Name <span>(required)</span></label>
                                <input type="text" name="Name" id="Name" required="">
                            </div>
                            <div>
                                <label for="Email">Email <span>(required)</span></label>
                                <input type="email" name="Email" id="Email" required="">
                            </div>
            
                            <div>
                                <input type="submit" name="go_Submit" value="Submit">
                            </div>
                        </form>
                    </div> 
                    <div class="helpdsk-content hidden" tab="2">
                        <div class="helpdesk-response-content">
                            <div>
                                <img src="${host}/images/Loading_2.gif"  class="wdh32x32">
                            </div>
                            <div>
                                <p>Sending form to Andrew ...</p>
                            </div>
                        </div>
                    </div> 
                    <div class="helpdsk-content hidden" tab="3">
                        <div class="helpdesk-response-content">
                            <div id="helpdesk-response">
                                <p>Thank you for your submission.</p>
                                <p>Our Accessibility Engineers are reviewing the information provided. As soon as we have made a complete assessment, Andrew will get in touch with you using the email address provided.</p>
                            </div>
                            <div>
                                <input type="button" value="Close" class="helpdsk-formsubmit-result-close">
                            </div>
                        </div>
                    </div> 
                </div>
            </div>


            <div class="right-bar">
                <div class="read-play-close-bar">
                    <div class="read-play-bar">
                        <div class="tooltip-left" title="Reader">
                            <div id="read-btn" ><img src="${host}/images/read-button.svg"  class="wdh32x32"></div>
                        </div>
                        <div class="tooltip-left" title="Player">
                            <div id="play-btn"><img src="${host}/images/play-button.svg" class="wdh32x32"></div>
                        </div>
                        <div class="tooltip-left" title="Help">
                            <div id="helpdsk-btn"><div class="helpdsk-si wdh32x32">?</div></div>
                        </div>
                    </div>
                    <div class="right-bar-close-btn">&times;</div>
                    <div class="smicon-on-rightbar">
                        <svg width="32" height="32" viewBox="0 0 32 32"><g transform="scale(0.03125 0.03125)"><path d="M512 192c-223.318 0-416.882 130.042-512 320 95.118 189.958 288.682 320 512 320 223.312 0 416.876-130.042 512-320-95.116-189.958-288.688-320-512-320zM764.45 361.704c60.162 38.374 111.142 89.774 149.434 150.296-38.292 60.522-89.274 111.922-149.436 150.296-75.594 48.218-162.89 73.704-252.448 73.704-89.56 0-176.858-25.486-252.452-73.704-60.158-38.372-111.138-89.772-149.432-150.296 38.292-60.524 89.274-111.924 149.434-150.296 3.918-2.5 7.876-4.922 11.86-7.3-9.96 27.328-15.41 56.822-15.41 87.596 0 141.382 114.616 256 256 256 141.382 0 256-114.618 256-256 0-30.774-5.452-60.268-15.408-87.598 3.978 2.378 7.938 4.802 11.858 7.302v0zM512 416c0 53.020-42.98 96-96 96s-96-42.98-96-96 42.98-96 96-96 96 42.982 96 96z"></path></g></svg>
                    </div>
                </div>
            </div>
            
        </div>`);   

    var speedSheet = {
        "0.8x": {
            speed: 0.8,
            next: "1.0x"
        },
        "1.0x": {
            prev: "0.8x",
            speed: 1,
            next: "1.2x"
        }, 
        "1.2x": {
            prev: "1.0x",
            speed: 1.2,
            next: "1.5x"
        }, 
        "1.5x": {
            prev: "1.2x",
            speed: 1.5,
            next: "1.8x"
        }, 
        "1.8x": {
            prev: "1.5x",
            speed: 1.8,
            next: "2.0x"
        }, 
        "2.0x": {
            prev: "1.8x",
            speed: 2
        }
    }

    function processHoverEvent(btn, hoverHTML, originHTML, confirmFunc){
        btn.hover(function(){
                if(confirmFunc&&!confirmFunc()) return;
                if(!btn.hasClass("hovered-hhh")){
                    btn.addClass("hovered-hhh");
                    btn.html(hoverHTML);
                }
            }, function(){
                if(confirmFunc&&!confirmFunc()) return;
                btn.html(originHTML);
                btn.removeClass("hovered-hhh");
        });
    }
    $(".smicon").hover(function(){
        $(".smicon-hover").removeClass("hidden");
        $(".smicon").addClass("hover");
        }, function(){
        $(".smicon-hover").addClass("hidden");
        $(".smicon").removeClass("hover");
    });

    function setStyleSheetsForReaderMode(mode){
        if (mode){
            $(`link[rel="stylesheet"]`)
                .filter(function() {
                    console.log("filter stylesheets", this.href);
                    return this.href.indexOf(host)==-1 && this.href.indexOf("fonts.googleapis.com")==-1;
                }).attr('disabled', 'disabled');
            $(`link[href="${host}/stylesheets/reader.css"]`).removeAttr('disabled');
        } else {
            $(`link[rel="stylesheet"]`)
                .filter(function() {
                    console.log("filter stylesheets", this.href);
                    return this.href.indexOf(host)==-1 && this.href.indexOf("fonts.googleapis.com")==-1;
                }).removeAttr('disabled', 'disabled');
            $(`link[href="${host}/stylesheets/reader.css"]`).attr('disabled', 'disabled');
        }
    }
    var rdBtn = $("#read-btn");
    rdBtn.click(function(){
        if(!rdBtn.hasClass( "sel" )) {
            rdBtn.addClass("sel");
            rdBtn.removeClass("hovered-hhh");
            rdBtn.html(`<img src="${host}/images/read-button-sel.svg"  class="rdpl">`);
            $(".reader-bottom-bar").removeClass("hidden");

            setStyleSheetsForReaderMode(true);
            if (plBtn.hasClass("sel")){
                $(".reader-bottom-bar").addClass("half-size");
                $(".player-bottom-bar").addClass("half-size");
            }
        }
        else {
            rdBtn.removeClass("sel");
            if (typeof InstallTrigger !== `undefined`){
                $(`body`).css(`MozTransform`,``);
                $(`body`).css(`width`,``);
            } else {
                $(`body`).css(`zoom`, ``);
                $(`body`).css(`width`, ``);
            }

            setStyleSheetsForReaderMode(false);
            rdBtn.html(`<img src="${host}/images/read-button.svg"  class="wdh32x32">`);
            $(".reader-bottom-bar").addClass("hidden");
            $(".reader-bottom-bar").removeClass("half-size");
            $(".player-bottom-bar").removeClass("half-size");
        }
    });

    var plBtn = $("#play-btn");
    plBtn.click(function(){
        if(!plBtn.hasClass( "sel" )) {
            plBtn.addClass("sel");
            plBtn.removeClass("hovered-hhh");
            plBtn.html(`<img src="${host}/images/play-button-sel.svg"  class="rdpl">`);
            $(".player-bottom-bar").removeClass("hidden");
            if (rdBtn.hasClass("sel")){
                $(".reader-bottom-bar").addClass("half-size");
                $(".player-bottom-bar").addClass("half-size");
            }
        }
        else {
            plBtn.removeClass("sel");
            plBtn.html(`<img src="${host}/images/play-button.svg"  class="wdh32x32">`);
            $(".player-bottom-bar").addClass("hidden");
            $(".reader-bottom-bar").removeClass("half-size");
            $(".player-bottom-bar").removeClass("half-size");
        }
    });

    var hlBtn = $("#helpdsk-btn");
    hlBtn.click(function(){
        if(!hlBtn.hasClass( "sel" )) {
            hlBtn.addClass("sel");
            $("#helpdesk-panel").removeClass("hidden");
            $( ".helpdsk-content[tab=1]" ).removeClass("hidden");
            $( ".helpdsk-content[tab=2]" ).addClass("hidden");
            $( ".helpdsk-content[tab=3]" ).addClass("hidden");
        }
        else {
            hlBtn.removeClass("sel");
            $("#helpdesk-panel").addClass("hidden");
            $( ".helpdsk-content[tab=1]" ).removeClass("hidden");
            $( ".helpdsk-content[tab=2]" ).addClass("hidden");
            $( ".helpdsk-content[tab=3]" ).addClass("hidden");
        }
    });
    

    processHoverEvent(plBtn, 
        `<img src="${host}/images/play-button-sel.svg" class="wdh32x32">`, 
        `<img src="${host}/images/play-button.svg" class="wdh32x32">`,
        function () { return !plBtn.hasClass("sel");});

    processHoverEvent(rdBtn, 
        `<img src="${host}/images/read-button-sel.svg" class="wdh32x32">`, 
        `<img src="${host}/images/read-button.svg" class="wdh32x32">`,
        function () { return !rdBtn.hasClass("sel");});

    processHoverEvent($("#zmin-btn"), 
        `<img src="${host}/images/zoom-in-sel.svg">`, 
        `<img src="${host}/images/zoom-in.svg">`);

    processHoverEvent($("#zmout-btn"), 
        `<img src="${host}/images/zoom-out-sel.svg">`, 
        `<img src="${host}/images/zoom-out.svg">`);

    processHoverEvent($("#refresh-btn"), 
        `<img src="${host}/images/refresh-sel.svg" class="wdh24x24">`, 
        `<img src="${host}/images/refresh.svg" class="wdh24x24">`);

    processHoverEvent($("#contrast-btn"), 
        `<img src="${host}/images/contrast-sel.svg" class="wdh24x24">`, 
        `<img src="${host}/images/contrast.svg" class="wdh24x24">`);

    processHoverEvent($("#contrast-prev-btn"), 
        `<img src="${host}/images/left-arrow-sel.svg">`, 
        `<img src="${host}/images/left-arrow.svg">`);

    processHoverEvent($("#contrast-next-btn"), 
        `<img src="${host}/images/right-arrow-sel.svg">`, 
        `<img src="${host}/images/right-arrow.svg">`);

    processHoverEvent($("#font-prev-btn"), 
        `<img src="${host}/images/left-arrow-sel.svg">`, 
        `<img src="${host}/images/left-arrow.svg">`);

    processHoverEvent($("#font-next-btn"), 
        `<img src="${host}/images/right-arrow-sel.svg">`, 
        `<img src="${host}/images/right-arrow.svg">`);

    processHoverEvent($("#mvprv-btn"), 
        `<img src="${host}/images/back-sel.svg" class="wdh24x24">`, 
        `<img src="${host}/images/back.svg" class="wdh24x24">`);

    processHoverEvent($("#mvnxt-btn"), 
        `<img src="${host}/images/next-sel.svg" class="wdh24x24">`, 
        `<img src="${host}/images/next.svg" class="wdh24x24">`);

    var ReadableElementList = [];
    var isRead = [];
    var PlayTime = [];
    var cPlayingIndex = 0;
    var currentAddOnSmIcon = $(".smicon")[0];
    var currentAddOnLayout = $(".project-add-on")[0];
    
    function getReadableElements(item){
        if ( !currentAddOnLayout.contains(item) &&
               !currentAddOnSmIcon.contains(item) &&
                item.tagName != "script" && item.tagName != "SCRIPT" &&
                item.tagName != "link" && item.tagName != "LINK" &&
                item.tagName != "head" && item.tagName != "HEAD" &&
                item.tagName != "meta" && item.tagName != "META" &&
                item.tagName != "title" && item.tagName != "TITLE" &&
                item.tagName != "noscript" && item.tagName != "NOSCRIPT" &&
                item.tagName != "style" && item.tagName != "STYLE" &&
                item.tagName != "img" && item.tagName != "IMG" &&
                item.tagName != "a" && item.tagName != "A") {
            var flag = Array.from(item.childNodes).some(
                    child => {
                        if (child.nodeType === child.TEXT_NODE &&
                            /.*[a-zA-Z]+.*$/.test(child.textContent)){
                            return true;
                        }
                        return false;
                    }
                );
            if (flag){
                ReadableElementList.push(item);
                PlayTime.push(item.textContent.length*50 + 2000);
          //      console.log(item.textContent);
            } else {
                for (var i = 0; i < item.childNodes.length; i ++){
                    getReadableElements(item.childNodes[i]);
                }
            }
        }
    }

    function markHiddenElemtents(){
        var totalElements = $('body').find('*');
        for (var i = 0; i < totalElements.length; i ++){
            if ($(totalElements[i]).is(":hidden") || $(totalElements[i]).height() == 0 || $(totalElements[i]).width() == 0){
                console.log("add reader-hidden", totalElements[i])
                $(totalElements[i]).addClass("reader-hidden");
            }
        }
        console.log("add reader-hidden", $(".img-wrapper").is(":hidden"));
        console.log("add reader-hidden",$(".img-wrapper").height(), $(".img-wrapper").width());
    }

    var lastReadCommandTime = new Date();
    function Read(cmdTime, cmdObj){
        if ( cmdTime.getTime() < lastReadCommandTime.getTime()){
            console.log("automatically cancelled", cmdObj.ci);
            return;
        }
        console.log("Read", (new Date()).getTime(), cmdTime.getTime(), "=", lastReadCommandTime.getTime(), cmdObj.ci);
        kathy.Speak(cmdObj);
   //     ableToMoveNxtPrv = true;
    }
    function prepareAudio(text){
            console.log("prepareAudio start");
            for (var i = 0; i < ReadableElementList.length; i ++){
                var keys = Object.keys(speedSheet);
                for (var j = 0; j < keys.length; j ++){
                    var toReadText = `\<speak><prosody rate="${speedSheet[keys[j]].speed*100}%">` + ReadableElementList[i].textContent + `</prosody></speak>`;

                    setTimeout(function(){
                        kathy.prepareAudio(toReadText);
                        console.log("prepare All finished");
                    }, (i+j)*500);
                }
            }
            console.log("prepareAudio end");
    }
    function addReadingAnimation(){
        node = ReadableElementList[cPlayingIndex];
   //     console.log(cPlayingIndex, node);
        node.classList.add("ae-reading");
        $('html, body').animate({
            scrollTop: $(node).offset().top-100
        }, 100);
        console.log("getSpeedNumber", getSpeedNumber());
        var toReadText = `\<speak><prosody rate="${getSpeedNumber()*100}%">` + node.textContent + `</prosody></speak>`;
        lastReadCommandTime = new Date();
        drawCanvasPlayProgress(ReadableElementList.length && cPlayingIndex/ReadableElementList.length, true);

        setTimeout(Read.bind(this, lastReadCommandTime, {
            idx: lastReadCommandTime.getTime(), 
            text: toReadText,
            ci: cPlayingIndex
        }), 300);

        $(".audio-events").on( "reading:finish", function( event, idx, ci ) {
       //     console.log("param1 ", idx)
            node.classList.remove("ae-reading");
       //     console.log("finished", cPlayingIndex);
            if (isRead.indexOf(idx) != -1) {
          //      console.log("returned because of double event trigger", idx);
                return;
            }
            if (!playPauseBtn.hasClass("playing"))  {
                drawCanvasPlayProgress(ReadableElementList.length && cPlayingIndex/ReadableElementList.length, false);
           //     console.log("returned since paused *************");
                return;
            }

            isRead.push(idx);
            console.log("finish read ****", ci, idx);
            cPlayingIndex = ci + 1;
      //      console.log("moving to next");
            drawCanvasPlayProgress(ReadableElementList.length && cPlayingIndex/ReadableElementList.length, true);

            setTimeout(function(){
                if (cPlayingIndex >= ReadableElementList.length) {
                    cPlayingIndex = 0;
                }
                if (isRead.length > 100){
                    isRead = isRead.slice(80);
                }
                addReadingAnimation();
            }, 300);
        });
    }

    function drawCanvasPlayProgress(percent, playOrPause){
        var c=document.getElementById("play-status-canvas");
        var img = new Image();
        img.onload = function() {
            var ctx=c.getContext("2d");
            ctx.strokeStyle = "#FFF";
            ctx.lineWidth = 6;
            ctx.fillStyle="#99A2AA";
            ctx.fillRect(-50,-50,100,100);
            ctx.beginPath();
            ctx.arc(23,23,20,0,2*Math.PI);
            ctx.stroke();


            ctx.strokeStyle = "#98C94D";
            ctx.lineWidth = 6;
            ctx.beginPath();
      //      console.log("percent", percent);
            ctx.arc(23,23,20,-0.5*Math.PI,(percent*2-0.5)*Math.PI);
            ctx.stroke();
            ctx.drawImage(img, 12, 12, 22, 22);
        }
        if (playOrPause)//play
            img.src = `${host}/images/pause-symbol.svg`;
        else 
            img.src = `${host}/images/play-symbol.svg`;
    }
    drawCanvasPlayProgress(0);

    var currFFZoom = 1;
    var currIEZoom = 100;
    $("#zmin-btn").click(function(){
     //   console.log($.browser);
        if (typeof InstallTrigger !== `undefined`){
            if (currFFZoom > 5){
                alert("can't zoomin more");
                return;
            }
            var step = 0.02;
            currFFZoom += step; 
            $(`body`).css(`MozTransform`,`scale(` + currFFZoom + `)`);
            $(`body`).css(`width`,` ` + 100/currFFZoom + `%`);
//            $(`.project-add-on`).css(`MozTransform`,`scale(` + 1/currFFZoom + `)`);
        } else {
            if (currIEZoom > 500){
                alert("can't zoomin more");
                return;
            }
            var step = 2;
            currIEZoom += step;
            $(`body`).css(`zoom`, ` ` + currIEZoom + `%`);
            $(`body`).css(`width`, ` ` + 10000/currIEZoom + `%`);
//            $(`.project-add-on`).css(`zoom`, ` ` + 10000/currIEZoom + `%`);
        }
    });

    $("#zmout-btn").click(function(){
       if (typeof InstallTrigger !== `undefined`){
            if (currFFZoom < 0.04){
                alert("can't zoomout more");
                return;
            }
            var step = 0.02;
            currFFZoom -= step;                 
            $(`body`).css(`MozTransform`,`scale(` + currFFZoom + `)`);
            $(`body`).css(`width`,` ` + 100/currFFZoom + `%`);
 //           $(`.project-add-on`).css(`MozTransform`,`scale(` + 1/currFFZoom + `)`);

        } else {
            if (currIEZoom < 4){
                alert("can't zoomout more");
                return;
            }
            var step = 2;
            currIEZoom -= step;
            $(`body`).css(`zoom`, ` ` + currIEZoom + `%`);
            $(`body`).css(`width`, ` ` + 10000/currIEZoom + `%`);
  //          $(`.project-add-on`).css(`zoom`, ` ` + 10000/currIEZoom + `%`);
        }
    });

    $("#refresh-btn").click(function(){
        if (typeof InstallTrigger !== `undefined`){
            currFFZoom = 1;                 
            $(`body`).css(`MozTransform`,`scale(` + currFFZoom + `)`);
            $(`.project-add-on`).css(`MozTransform`,`scale(` + 1/currFFZoom + `)`);

        } else {
            currIEZoom = 100;       
            $(`body`).css(`zoom`, ` ` + currIEZoom + `%`);
            $(`.project-add-on`).css(`zoom`, ` ` + 10000/currIEZoom + `%`);
        }
    });

    var contrastList = [{
            title: "contrast1",
            background: `#0000FF`,
            color: `#FFFF00`
        },{
            title: "contrast2",
            background: `#000080`,
            color: `#00FF00`
        },{
            title: "contrast3",
            background: `#800000`,
            color: `#FFF`
        },{
            title: "contrast4",
            background: `#2D2D2D`,
            color: `#ECECEC`
        },{
            title: "contrast5",
            background: `#000`,
            color: `#FFF`
        }];

    var toChangeTags = $.merge($(`body`),$(`body`).find(`body, div, h1, h2, h3, h4, h5, h6, h7`));
    var toChangeFontTags = $.merge($('#font-btn'), $(`body`),$(`body`).find(`body, div, h1, h2, h3, h4, h5, h6, h7`));

    $("#contrast-next-btn").click(function(){
        for(var i = 0; i < contrastList.length; i ++){
            if($(`body`).hasClass(contrastList[i].title)){
     //           console.log("body class has "+ contrastList[i].title);
                break;
            }
        }
        if(i < contrastList.length){

            var $overflow1 = $( "<div id='overflow1'></div>" );
            $overflow1.css("height", $(document).height());
            $overflow1.addClass(contrastList[i].title);
            $( `html` ).append( $overflow1 );


            $(`body`).addClass("hidden");
            toChangeTags.toggleClass(
                contrastList[i].title 
                + ((i < contrastList.length - 1)? (" " + contrastList[i+1].title) : ""));
            setTimeout(function(){
                $overflow1.remove();
                $(`body`).removeClass("hidden");
            },100);

        } else {
            toChangeTags.addClass(contrastList[0].title);
        }
    });

    $("#contrast-prev-btn").click(function(){
        for(var i = 0; i < contrastList.length; i ++){
            if($(`body`).hasClass(contrastList[i].title)){
                break;
            }
        }
        if(i < contrastList.length){

            var $overflow1 = $( "<div id='overflow1'></div>" );
            $overflow1.css("height", $(document).height());
            $overflow1.addClass(contrastList[i].title);
            $( `html` ).append( $overflow1 );
            $(`body`).addClass("hidden");

            toChangeTags.toggleClass(
                contrastList[i].title 
                + ((i > 0)? (" " + contrastList[i-1].title) : ""));

            setTimeout(function(){
                $overflow1.remove();
                $(`body`).removeClass("hidden");
            },100);

        } else {
            toChangeTags.addClass(contrastList[4].title);
        }
    });

    $("#contrast-btn").click(function(){
        for(var i = 0; i < contrastList.length; i ++){
            if($(`body`).hasClass(contrastList[i].title)){
                break;
            }
        }
        if(i < contrastList.length){
            toChangeTags.removeClass(contrastList[i].title);
        }
    });

    var fontfaceList = [{
        title: `fontface-georgia`
    },{
        title: `fontface-opendyslexic`
    }
    // ,{
    //     title: `fontface-lato`
    // }
    ];


    $("#font-next-btn").click(function(){


        for(var i = 0; i < fontfaceList.length; i ++){
            if($(`body`).hasClass(fontfaceList[i].title)){
       //         console.log("body class has "+ fontfaceList[i].title);
                break;
            }
        }
        if(i < fontfaceList.length){
            toChangeFontTags.toggleClass(
                fontfaceList[i].title 
                + ((i < fontfaceList.length - 1)? (" " + fontfaceList[i+1].title) : ""));
            // toChangeTags.removeClass(fontfaceList[i].title);
            // if (i < fontfaceList.length - 1) toChangeTags.addClass(fontfaceList[i+1].title);
        } else {
            toChangeFontTags.addClass(fontfaceList[0].title);
        }
    });

    $("#font-prev-btn").click(function(){
        for(var i = 0; i < fontfaceList.length; i ++){
            if($(`body`).hasClass(fontfaceList[i].title)){
                break;
            }
        }
        if(i < fontfaceList.length){
            toChangeFontTags.toggleClass(
                fontfaceList[i].title 
                + ((i > 0)? (" " + fontfaceList[i-1].title) : ""));
            // toChangeTags.removeClass(fontfaceList[i].title);
            // if (i > 0) toChangeTags.addClass(fontfaceList[i-1].title);
        } else {
            toChangeFontTags.addClass(fontfaceList[fontfaceList.length - 1].title);
        }
    });

    $("#font-btn").click(function(){
        for(var i = 0; i < fontfaceList.length; i ++){
            if($(`body`).hasClass(fontfaceList[i].title)){
                break;
            }
        }
        if(i < fontfaceList.length){
            toChangeFontTags.removeClass(fontfaceList[i].title);
        }
    });

    getReadableElements(document.body);
    markHiddenElemtents();
    prepareAudio();
    $('head').append('<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Tangerine|Inconsolata|Droid+Sans">');


    var playPauseBtn = $("#play-status-canvas");
    var paused = false;
    playPauseBtn.click(function(){
        if (playPauseBtn.hasClass("playing")){
            console.log("click pause");
            playPauseBtn.removeClass("playing");
            drawCanvasPlayProgress(cPlayingIndex/ReadableElementList.length, false);
            kathy.Pause();
            paused = true;
        }
        else {
            console.log("click resume");
            playPauseBtn.addClass("playing");
            console.log("if (kathy.isSpeaking)", kathy.isSpeaking());
            {                
                drawCanvasPlayProgress(cPlayingIndex/ReadableElementList.length, true);
                if(paused){
                    kathy.Resume();
                } else {
                    addReadingAnimation();
                }
            }

        }
    });

    var ableToMoveNxtPrv = true;
    $("#mvprv-btn").click(function(){
        if (cPlayingIndex > 0 && ableToMoveNxtPrv) {
            ableToMoveNxtPrv = false;
            kathy.ShutUp();
            kathy.ForgetCachedSpeech();
            kathy = ChattyKathy(settings);
            //setTimeout(function(){
            playPauseBtn.addClass("playing");
                ReadableElementList[cPlayingIndex].classList.remove("ae-reading");
                cPlayingIndex -= 1;
                addReadingAnimation();
                ableToMoveNxtPrv = true;
            //}, 10);
        } else {
            console.log("cannot Move Prev");
        }
    });

    $("#mvnxt-btn").click(function(){
        if (cPlayingIndex < ReadableElementList.length - 1 && ableToMoveNxtPrv) {
            ableToMoveNxtPrv = false;
            kathy.ShutUp();
            kathy.ForgetCachedSpeech();
            kathy = ChattyKathy(settings);
            //setTimeout(function(){
            playPauseBtn.addClass("playing");
                ReadableElementList[cPlayingIndex].classList.remove("ae-reading");
                cPlayingIndex += 1;
                addReadingAnimation();
                ableToMoveNxtPrv = true;
            //}, 10);
        } else {
            console.log("cannot Move Next");
        }
    });
    function getSpeedString(){
        var cSpeed = $("#play-speed-reset-btn").html();
        cSpeed = cSpeed.replace(`<span style="width:30px;height:30px;">`, "");
        cSpeed = cSpeed.replace(`</span>`, "");
        return cSpeed;
    }

    function getSpeedNumber(){
        var spdString = getSpeedString();
        return parseFloat(spdString.slice(0, spdString.length-1));
    }
    $("#play-speed-decrease-btn").click(function(){
        var cSpeed = getSpeedString();
        var nextSpeed = speedSheet[cSpeed].prev;
        if (nextSpeed)
            $("#play-speed-reset-btn").html(`<span style="width:30px;height:30px;">${nextSpeed}</span>`);
    });

    $("#play-speed-increase-btn").click(function(){
        var cSpeed = getSpeedString();
        var nextSpeed = speedSheet[cSpeed].next;
        if (nextSpeed)
            $("#play-speed-reset-btn").html(`<span style="width:30px;height:30px;">${nextSpeed}</span>`);
    });

    $(".right-bar-close-btn").click(function(){
        $(".project-add-on").addClass("hidden");
        $(".smicon").removeClass("hidden");
    });

    $(".reader-bar-close-btn").click(function(){
        $(".reader-bottom-bar").addClass("hidden");
        rdBtn.removeClass("sel");
        rdBtn.html(`<img src="${host}/images/read-button.svg" class="wdh32x32">`);
    });

    $(".player-bar-close-btn").click(function(){
        $(".player-bottom-bar").addClass("hidden");
        plBtn.removeClass("sel");
        plBtn.html(`<img src="${host}/images/play-button.svg" class="wdh32x32">`);
        $(".reader-bottom-bar").removeClass("half-size");
        $(".player-bottom-bar").removeClass("half-size");
    });

    $(".helpdsk-close-btn").click(function(){
        $("#helpdesk-panel").addClass("hidden");
        hlBtn.removeClass("sel");
        $( ".helpdsk-content[tab=1]" ).removeClass("hidden");
        $( ".helpdsk-content[tab=2]" ).addClass("hidden");
        $( ".helpdsk-content[tab=3]" ).addClass("hidden");
    });

    $(".helpdsk-formsubmit-result-close").click(function(){
        $("#helpdesk-panel").addClass("hidden");
        hlBtn.removeClass("sel");
        $( ".helpdsk-content[tab=1]" ).removeClass("hidden");
        $( ".helpdsk-content[tab=2]" ).addClass("hidden");
        $( ".helpdsk-content[tab=3]" ).addClass("hidden");
    });

    $(".smicon").click(function(){
        $(".project-add-on").removeClass("hidden");
        $(".smicon").addClass("hidden");
    })

    $('#helpdesk_form').on('submit', function(e) {
        e.preventDefault(); 
        var data = $("#helpdesk_form :input").serializeArray();
        console.log(data); 
        $( ".helpdsk-content[tab=1]" ).addClass("hidden");
        $( ".helpdsk-content[tab=2]" ).removeClass("hidden");
        $.post( "http://18.191.160.243:3003/api/helpdesk", data)
            .done(function( result ) {
                console.log( result );

                $( ".helpdsk-content[tab=2]" ).addClass("hidden");
                $( ".helpdsk-content[tab=3]" ).removeClass("hidden");
            });
    });