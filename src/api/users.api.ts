// import img1 from "@/assets/images/avatars/001-gamer.svg"
import User from "../utils/User"
const demoUsers = [ 
  new User({
    id: 1,
    name: { full: "Xopher D. Pollard aka Dad/dy/dos" },
    avatar: "001-gamer",
  }),
  new User({
    id: 2,
    name: { full: "Krislynn Night Pollard aka Nightlynn Nyx" },
    avatar: "002-gamer",
  }),
  new User({
    id: 3,
    name: { full: "Khronus Infinidee Pollard aka Bandus" },
    avatar: "051-gamer",
  }),
  new User({
    id: 4,
    name: { full: "Gaia RhaeSatori JudyPollard aka Moose Queen" },
    avatar: "010-gamer",
  }), 
  new User({
    id: 5,
    name: { full: "Ronan Tesla Roark aka Macaronan" },
    avatar: "004-gamer",
  }), 
  new User({
    id: 6,
    name: { full: "Ashley Nicole McQuinn aka Gale Axy" },
    avatar: "012-gamer",
  }), 
  new User({
    id: 7,
    name: { full: "Yvette Madison Judy aka Eevee" },
    avatar: "025-gamer",
  }), 
  new User({
    id: 8,
    name: { full: "Kairos Sol JudyPollard aka KaiBoy Bebop" },
    avatar: "009-gamer",
  }) 
]

let users = JSON.parse(localStorage.getItem('users') || '[]');
console.log("users", users);

if(users) {
  users = users?.map( (user:any) => new User(user) ); // convert plain objects to User instances
} else {
  localStorage.setItem('users', JSON.stringify(demoUsers)); // save default users to local storage
}

export default users;
