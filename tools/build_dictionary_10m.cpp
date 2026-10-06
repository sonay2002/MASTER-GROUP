#include <bits/stdc++.h>
using namespace std;

static const size_t TARGET = 10000000ULL;
static const int SHARDS = 256;

static void append_utf8(string &s, uint32_t cp){
    if(cp<=0x7F) s.push_back((char)cp);
    else if(cp<=0x7FF){ s.push_back((char)(0xC0|(cp>>6))); s.push_back((char)(0x80|(cp&63))); }
    else if(cp<=0xFFFF){ s.push_back((char)(0xE0|(cp>>12))); s.push_back((char)(0x80|((cp>>6)&63))); s.push_back((char)(0x80|(cp&63))); }
    else { s.push_back((char)(0xF0|(cp>>18))); s.push_back((char)(0x80|((cp>>12)&63))); s.push_back((char)(0x80|((cp>>6)&63))); s.push_back((char)(0x80|(cp&63))); }
}
static vector<uint32_t> utf8_decode(const string &s){
    vector<uint32_t> v;
    for(size_t i=0;i<s.size();){
        unsigned char c=s[i++];
        if(c<0x80) v.push_back(c);
        else if((c>>5)==0x6 && i<s.size()) v.push_back(((c&31)<<6)|(s[i++]&63));
        else if((c>>4)==0xE && i+1<s.size()) v.push_back(((c&15)<<12)|((s[i++]&63)<<6)|(s[i++]&63));
        else if((c>>3)==0x1E && i+2<s.size()) v.push_back(((c&7)<<18)|((s[i++]&63)<<12)|((s[i++]&63)<<6)|(s[i++]&63));
    }
    return v;
}
static string utf8_encode(const vector<uint32_t> &v){ string s; s.reserve(v.size()*2); for(auto cp:v) append_utf8(s,cp); return s; }
static bool is_ru(uint32_t cp){ return (cp>=0x430&&cp<=0x44F)||cp==0x451||cp==0x454||cp==0x456||cp==0x457||cp==0x491; }
static bool is_alpha_cp(uint32_t cp){ return (cp>='a'&&cp<='z')||(cp>='A'&&cp<='Z')||is_ru(cp)||cp==0x103||cp==0x103B||cp==0xE2||cp==0xE2B||cp==0xEE||cp==0xEE5||cp==0x219||cp==0x15E||cp==0x15F||cp==0x21A||cp==0x21B; }
static uint32_t lower_cp(uint32_t cp){
    if(cp>='A'&&cp<='Z') return cp+32;
    if(cp>=0x410&&cp<=0x42F) return cp+0x20;
    if(cp==0x401) return 0x451;
    return cp;
}
static string lower_utf8(const string &s){ auto v=utf8_decode(s); for(auto &c:v)c=lower_cp(c); return utf8_encode(v); }
static bool good(const vector<uint32_t>& v){ if(v.size()<2||v.size()>32)return false; for(auto c:v){ if(c=='-'||c=='\''||is_alpha_cp(c)) continue; return false;} return true; }
static string ru_to_lat(const vector<uint32_t> &v){
    static const unordered_map<uint32_t,string> mp={
      {0x430,"a"},{0x431,"b"},{0x432,"v"},{0x433,"g"},{0x434,"d"},{0x435,"e"},{0x451,"yo"},{0x436,"zh"},{0x437,"z"},{0x438,"i"},{0x439,"y"},{0x43A,"k"},{0x43B,"l"},{0x43C,"m"},{0x43D,"n"},{0x43E,"o"},{0x43F,"p"},{0x440,"r"},{0x441,"s"},{0x442,"t"},{0x443,"u"},{0x444,"f"},{0x445,"kh"},{0x446,"ts"},{0x447,"ch"},{0x448,"sh"},{0x449,"sch"},{0x44A,""},{0x44B,"y"},{0x44C,""},{0x44D,"e"},{0x44E,"yu"},{0x44F,"ya"},{0x456,"i"},{0x457,"yi"},{0x454,"ye"},{0x491,"g"}
    };
    string out; for(auto c:v){auto it=mp.find(c); if(it!=mp.end())out+=it->second; else if(c<128)out.push_back((char)c); else { string t; append_utf8(t,c); out+=t; }} return out;
}
static const string RU_ALPHA="абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
static const string EN_ALPHA="abcdefghijklmnopqrstuvwxyz";
static string kb_neighbors(uint32_t c){
    static const unordered_map<char,string> kb={
    {'q',"was"},{'w',"qeas"},{'e',"wrsd"},{'r',"etfd"},{'t',"rygf"},{'y',"tugh"},{'u',"yihj"},{'i',"uojk"},{'o',"ipkl"},{'p',"ol"},
    {'a',"qwsz"},{'s',"awedx"},{'d',"serfc"},{'f',"drtgvc"},{'g',"ftyhvb"},{'h',"gyujnb"},{'j',"huikmn"},{'k',"jiolm"},{'l',"kop"},
    {'z',"asx"},{'x',"szc"},{'c',"xdfv"},{'v',"cfgb"},{'b',"vghn"},{'n',"bhjm"},{'m',"njk"}};
    if(c<128){auto it=kb.find((char)c); if(it!=kb.end()) return it->second;} return {};
}
static uint32_t crc32bytes(const string &s){ uint32_t crc=0xFFFFFFFFu; for(unsigned char c:s){crc^=c;for(int k=0;k<8;k++)crc=(crc>>1)^(0xEDB88320u & -(int)(crc&1));} return ~crc; }

static vector<string> variants_for(const string &w, int maxv){
    vector<uint32_t> base=utf8_decode(w); vector<string> out; out.reserve(maxv); unordered_set<string> local; local.reserve(maxv*2);
    auto add=[&](const vector<uint32_t>& v){ if((int)out.size()>=maxv||!good(v))return; string s=utf8_encode(v); if(local.insert(s).second)out.push_back(s); };
    auto addstr=[&](const string& s){auto v=utf8_decode(s); add(v);};
    addstr(w);
    bool ru=false; for(auto c:base) if(is_ru(c)){ru=true;break;}
    if(ru){ string lat=ru_to_lat(base); if(!lat.empty()&&lat!=w) addstr(lat); }
    for(size_t i=0;i<base.size() && (int)out.size()<maxv;i++){
        auto v=base; v.erase(v.begin()+i); add(v);
        v=base; v.insert(v.begin()+i,base[i]); add(v);
        if(i+1<base.size()){v=base; swap(v[i],v[i+1]); add(v);}
        uint32_t c=base[i];
        if(c<128){auto kb=kb_neighbors(c); for(size_t k=0;k<kb.size() && k<4;k++){v=base;v[i]=(unsigned char)kb[k];add(v);}}
        if(ru){ static const vector<uint32_t> rv={0x430,0x435,0x438,0x43E,0x443,0x44B,0x44F}; if(find(rv.begin(),rv.end(),lower_cp(c))!=rv.end()){for(size_t k=0;k<4;k++){v=base;v[i]=rv[k];add(v);}} }
        else if(isalpha((int)c)){ const string ev="aeio"; for(char r:ev){v=base;v[i]=r;add(v);} }
        if((int)out.size()<maxv){ v=base; v.insert(v.begin()+i,(ru?RU_ALPHA:EN_ALPHA)[(i*17+base.size())% (ru?RU_ALPHA.size():EN_ALPHA.size())]); add(v); }
    }
    uint32_t seed=2166136261u; for(unsigned char c:w) seed=(seed^c)*16777619u;
    auto alpha_to_vec=[&](bool r)->vector<uint32_t>{vector<uint32_t> a; string ss=r?RU_ALPHA:EN_ALPHA; auto d=utf8_decode(ss); return d;};
    auto alpha=alpha_to_vec(ru);
    int guard=0;
    while((int)out.size()<maxv && guard++<5000){
        seed=1664525u*seed+1013904223u; auto v=base; int ops=1+(seed%3);
        for(int z=0;z<ops;z++){
            seed=1664525u*seed+1013904223u; if(v.empty()) break; size_t i=(seed>>8)%v.size(); int op=seed&3;
            if(op==0 && v.size()>2) v.erase(v.begin()+i);
            else if(op==1){seed=1664525u*seed+1013904223u; v[i]=alpha[seed%alpha.size()];}
            else if(op==2 && v.size()<32) v.insert(v.begin()+i,v[i]);
            else if(i+1<v.size()) swap(v[i],v[i+1]);
        }
        add(v);
        if(out.size()>= (size_t)maxv) break;
        if((int)out.size()<maxv && base.size()<=4){
            auto x=base; x.push_back(alpha[(seed>>16)%alpha.size()]); add(x);
            x=base; x.insert(x.begin(),alpha[(seed>>20)%alpha.size()]); add(x);
        }
    }
    return out;
}

int main(int argc,char**argv){
    if(argc<3){cerr<<"usage: build10m <seeds.txt> <outdir>\n";return 2;}
    string seedfile=argv[1], outdir=argv[2]; filesystem::create_directories(outdir);
    vector<string> seeds; string line; ifstream in(seedfile); while(getline(in,line)){line=lower_utf8(line); if(!line.empty()) seeds.push_back(line);} in.close();
    cerr<<"seeds="<<seeds.size()<<"\n";
    vector<ofstream> files; files.reserve(SHARDS); for(int i=0;i<SHARDS;i++){char buf[64];sprintf(buf,"%s/shard-%03d.txt",outdir.c_str(),i); files.emplace_back(buf,ios::out|ios::binary|ios::trunc); if(!files.back()){cerr<<"open failed "<<buf<<"\n";return 3;}}
    unordered_set<string> seen; seen.reserve(12000000); seen.max_load_factor(0.72f);
    size_t accepted=0; size_t attempts=0;
    // Protected high-value corrections for the exact Master Group use cases.
    // They are inserted first, so later generated variants can never shadow them.
    const vector<pair<string,string>> forced={
      {"креплние","крепление"},{"креплн","крепление"},{"крпление","крепление"},{"крепелние","крепление"},{"крепленье","крепление"},
      {"мотра","мотора"},{"мтора","мотор"},{"мтор","мотор"},{"мотро","мотор"},{"рам","рама"},{"рма","рама"},
      {"устанвка","установка"},{"устновка","установка"},{"устновит","установить"},{"раковн","раковина"},{"раковна","раковина"},
      {"сбрка","сборка"},{"сборк","сборка"},{"двигател","двигатель"},{"двгатель","двигатель"},{"уклдк","укладка"},{"укладк","укладка"},
      {"кафла","кафель"},{"кафел","кафель"},{"ваной","ванной"},{"ваннй","ванной"},{"убрть","убрать"},{"убарт","убрать"},
      {"интелект","интеллект"},{"интелек","интеллект"},{"искуственный","искусственный"},{"искуственый","искусственный"},
      {"превет","привет"},{"севодня","сегодня"},{"пажалуйста","пожалуйста"},{"вообщем","в общем"},{"монтж","монтаж"},
      {"креплене","крепление"},{"устновка","установка"},{"плитк","плитка"},{"плиткаа","плитка"},{"смеситль","смеситель"},
      {"потолк","потолок"},{"трба","труба"},{"кабел","кабель"},{"провд","провод"},{"насос","насос"},{"нсос","насос"},
      {"филтр","фильтр"},{"генераор","генератор"},{"двер","дверь"},{"окн","окно"},{"ворта","ворота"},
      {"металлокнструкция","металлоконструкция"},{"сварк","сварка"},{"сверлние","сверление"},{"бурен","бурение"},
      {"герметизац","герметизация"},{"диагностка","диагностика"},{"обслужван","обслуживание"},{"регулировкаа","регулировка"},
      {"демонтаж","демонтаж"},{"замен","замена"},{"ремонт","ремонт"},{"протечка","протечка"},{"покос","покос"},{"трав","трава"},
      {"дерев","дерево"},{"ветк","ветка"},{"корен","корень"},{"вывз","вывоз"},{"погрузк","погрузка"},{"очистк","очистка"},
      {"шлифовк","шлифовка"},{"утеплени","утепление"},{"шпаклевк","шпаклевка"},{"грунтовк","грунтовка"},{"прокладк","прокладка"},
      {"подключен","подключение"},{"настроик","настройка"},{"изготовлени","изготовление"},{"разборк","разборка"},{"создани","создание"},
      {"разработк","разработка"}
    };
    for(const auto &fc:forced){
      if(accepted>=TARGET) break;
      if(!seen.insert(fc.first).second) continue;
      uint32_t sh=crc32bytes(fc.first)&255u;
      files[sh] << fc.first << '\t' << fc.second << '\n';
      ++accepted;
    }
    for(int round=0; accepted<TARGET; ++round){
        for(size_t si=0;si<seeds.size() && accepted<TARGET;si++){
            const string &canon=seeds[si];
            bool ruSeed=false; for(auto cp:utf8_decode(canon)) if(is_ru(cp)){ruSeed=true;break;}
            // Give the Russian vocabulary much wider correction neighborhoods so the
            // 10M external memory is useful for Russian, not just English.
            auto vars=variants_for(canon, ruSeed?1800:150);
            // Later rounds deliberately rotate the family through deterministic extra edits.
            if(round>0){
                vars.push_back(canon + (RU_ALPHA[(round+si)%RU_ALPHA.size()]));
                if(canon.size()>2){ auto v=utf8_decode(canon); size_t i=(round+si)%v.size(); v[i]=utf8_decode(RU_ALPHA)[(round*7+si)%utf8_decode(RU_ALPHA).size()]; vars.push_back(utf8_encode(v)); }
            }
            for(auto &cand:vars){
                ++attempts;
                if(cand.size()<2) continue;
                auto [it,ok]=seen.insert(cand); if(!ok) continue;
                uint32_t sh=crc32bytes(cand)&255u;
                files[sh] << cand << '\t' << canon << '\n';
                ++accepted;
                if(accepted%500000==0) cerr<<"accepted="<<accepted<<" attempts="<<attempts<<" round="<<round<<"\n";
                if(accepted>=TARGET) break;
            }
        }
        if(round>50 && accepted<TARGET){cerr<<"stalled after rounds, accepted="<<accepted<<"\n";break;}
    }
    for(auto &f:files) f.close();
    cerr<<"FINAL_ACCEPTED="<<accepted<<"\n";
    if(accepted!=TARGET) return 4;
    return 0;
}
