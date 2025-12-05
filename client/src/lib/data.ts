import hikingImg from "@assets/generated_images/family_hiking_in_nature.png";
import museumImg from "@assets/generated_images/kids_playing_in_a_science_museum.png";
import picnicImg from "@assets/generated_images/family_picnic_in_a_park.png";
import avatar1 from "@assets/generated_images/family_portrait_avatar_1.png";
import avatar2 from "@assets/generated_images/family_portrait_avatar_2.png";
import mapBg from "@assets/generated_images/stylized_map_background_for_explore_screen.png";

export interface Experience {
  id: string;
  title: string;
  image: string;
  duration: string;
  cost: "Free" | "$" | "$$";
  ages: string;
  family: string;
  familyAvatar: string;
  category: string;
  location: { lat: number; lng: number; name: string };
}

export const experiences: Experience[] = [
  {
    id: "1",
    title: "Hidden Creek Trail",
    image: hikingImg,
    duration: "1.5 hrs",
    cost: "Free",
    ages: "3-7",
    family: "The Johnsons",
    familyAvatar: avatar1,
    category: "Outdoor",
    location: { lat: 37.7749, lng: -122.4194, name: "Presidio Park" },
  },
  {
    id: "2",
    title: "Interactive Science Lab",
    image: museumImg,
    duration: "2 hrs",
    cost: "$$",
    ages: "5-12",
    family: "The Chengs",
    familyAvatar: avatar2,
    category: "Indoor",
    location: { lat: 37.7849, lng: -122.4094, name: "Discovery Museum" },
  },
  {
    id: "3",
    title: "Sunset Picnic Spot",
    image: picnicImg,
    duration: "1 hr",
    cost: "$",
    ages: "All ages",
    family: "The Wilkinsons",
    familyAvatar: avatar1,
    category: "Outdoor",
    location: { lat: 37.7649, lng: -122.4294, name: "Dolores Park" },
  },
];

export const pods = [
  {
    id: "1",
    name: "Seattle Adventurers",
    members: [avatar1, avatar2, avatar1],
    description: "Weekend hikes and outdoor fun for families with toddlers.",
  },
  {
    id: "2",
    name: "Museum Buddies",
    members: [avatar2, avatar1],
    description: "Rainy day meetups at local museums.",
  },
];

export const currentUser = {
  name: "The Wilkinsons",
  avatar: avatar1,
  location: "Costa Rica",
  kids: "2 kids • ages 2 & 4",
  interests: ["Hiking", "Food", "Nature", "Art"],
};

export { mapBg };
